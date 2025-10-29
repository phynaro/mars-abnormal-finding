const sql = require("mssql");
const dbConfig = require("../config/dbConfig");

/**
 * Cedar CMMS Integration Service
 * Handles integration between AbnormalReport system and Cedar CMMS
 */
class CedarIntegrationService {
  constructor() {
    this.pool = null;
    this.initializePool();
  }

  async initializePool() {
    try {
      this.pool = await sql.connect(dbConfig);
      console.log("✅ Cedar Integration Service: Database connected");
    } catch (error) {
      console.error(
        "❌ Cedar Integration Service: Database connection failed:",
        error.message
      );
    }
  }

  /**
   * Create a new Work Order in Cedar CMMS from a ticket
   * @param {Object} ticketData - Ticket data
   * @returns {Object} Integration result
   */
  async createWorkOrder(ticketData) {
    const transaction = new sql.Transaction(this.pool);

    try {
      await transaction.begin();
      console.log(`🔄 Creating Cedar WO for ticket ${ticketData.ticketId}`);

      // Get current date/time in Cedar format
      const { date: currentDate, time: currentTime } =
        this.getCurrentDateTime();

      // Prepare WO creation data
      const woData = this.prepareWorkOrderData(
        ticketData,
        currentDate,
        currentTime
      );

      // Create Work Order using sp_WOMain_Insert
      const woRequest = transaction.request();
      this.setWorkOrderParameters(woRequest, woData);

      console.log("Executing sp_WOMain_Insert...");
      const result = await woRequest.execute("sp_WOMain_Insert");
      console.log("Stored procedure executed. Result:", result);

      // Get the WO number
      const woNoRequest = transaction.request();
      const woNoResult = await woNoRequest.query(
        "SELECT IDENT_CURRENT('WO') as WONO"
      );
      const woNo = woNoResult.recordset[0].WONO;

      if (!woNo || woNo === 0) {
        throw new Error("Failed to create Work Order - no WO number returned");
      }

      // Update WO status to "Work Initiated" (WOStatusNo = 1, WFStatusCode = '10')
      const updateStatusRequest = transaction.request();
      await updateStatusRequest.query(`
                UPDATE WO 
                SET WOStatusNo = 1, WFStatusCode = '10' 
                WHERE WONO = ${woNo}
            `);

      // Get WO Code for response
      const codeRequest = transaction.request();
      codeRequest.input("WONo", sql.Int, woNo);
      const codeResult = await codeRequest.query(
        "SELECT WOCODE FROM WO WHERE WONO = @WONo"
      );
      const woCode = codeResult.recordset[0]?.WOCODE || `WO${woNo}`;

      await transaction.commit();

      // Update ticket with Cedar WO information
      await this.updateTicketWithCedarInfo(
        ticketData.ticketId,
        woNo,
        woCode,
        "success"
      );

      // Log successful integration
      await this.logIntegration(
        ticketData.ticketId,
        woNo,
        "create",
        "success",
        woData,
        {
          wono: woNo,
          wocode: woCode,
        }
      );

      console.log(`✅ Cedar WO created successfully: ${woCode} (${woNo})`);

      return {
        success: true,
        wono: woNo,
        wocode: woCode,
        message: "Work Order created successfully in Cedar CMMS",
      };
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Failed to create Cedar WO:", error.message);

      // Update ticket with error information
      await this.updateTicketWithCedarInfo(
        ticketData.ticketId,
        null,
        null,
        "error",
        error.message
      );

      // Log failed integration
      await this.logIntegration(
        ticketData.ticketId,
        null,
        "create",
        "error",
        ticketData,
        null,
        error.message
      );

      throw error;
    }
  }

  /**
   * Update Work Order status in Cedar CMMS based on ticket status change
   * @param {number} ticketId - Ticket ID
   * @param {string} ticketStatus - New ticket status
   * @param {Object} updateData - Additional update data
   * @returns {Object} Integration result
   */
  async updateWorkOrderStatus(ticketId, ticketStatus, updateData = {}) {
    try {
      // Get ticket with Cedar WO information
      const ticketResult = await this.pool
        .request()
        .input("ticketId", sql.Int, ticketId).query(`
                    SELECT t.id, t.cedar_wono, t.cedar_wocode, t.puno, t.assigned_to,
                           t.accepted_at, t.finished_at, t.schedule_finish,
                           t.schedule_start, t.planed_at, t.planed_by,
                           t.actual_start_at, t.actual_finish_at,
                           t.created_by, t.title, t.description
                    FROM IgxTickets t
                    WHERE t.id = @ticketId
                `);

      const ticket = ticketResult.recordset[0];
      if (!ticket) {
        throw new Error("Ticket not found");
      }

      if (!ticket.cedar_wono) {
        console.log(
          `⚠️ Ticket ${ticketId} has no Cedar WO - skipping status update`
        );
        return { success: false, message: "No Cedar WO found for this ticket" };
      }

      console.log(
        `🔄 Updating Cedar WO ${ticket.cedar_wono} status to ${ticketStatus}`
      );

      // Get status mapping
      const statusMapping = this.getStatusMapping(ticketStatus);
      if (!statusMapping) {
        console.log(
          `⚠️ No status mapping found for ${ticketStatus} - skipping update`
        );
        return {
          success: false,
          message: `No status mapping for ${ticketStatus}`,
        };
      }

      // Prepare update data
      const updateFields = this.prepareStatusUpdateFields(
        ticketStatus,
        updateData,
        ticket
      );

      // Execute update
      const updateRequest = this.pool.request();
      updateFields.forEach((field) => {
        updateRequest.input(field.name, field.type, field.value);
      });
      updateRequest.input("wono", sql.Int, ticket.cedar_wono);

      const updateQuery = `UPDATE WO SET ${updateFields
        .map((f) => `${f.field} = @${f.name}`)
        .join(", ")} WHERE WONO = @wono`;
      await updateRequest.query(updateQuery);
      
      // Update ticket sync status
      await this.updateTicketWithCedarInfo(
        ticketId,
        ticket.cedar_wono,
        ticket.cedar_wocode,
        "success"
      );

      // Log successful integration
      await this.logIntegration(
        ticketId,
        ticket.cedar_wono,
        "status_update",
        "success",
        {
          ticketStatus,
          statusMapping,
          updateData,
        },
        { updated: true }
      );

      console.log(
        `✅ Cedar WO ${ticket.cedar_wono} status updated to ${ticketStatus}`
      );

      return {
        success: true,
        wono: ticket.cedar_wono,
        wocode: ticket.cedar_wocode,
        message: `Work Order status updated to ${ticketStatus}`,
      };
    } catch (error) {
      console.error("❌ Failed to update Cedar WO status:", error.message);

      // Update ticket with error information
      await this.updateTicketWithCedarInfo(
        ticketId,
        null,
        null,
        "error",
        error.message
      );

      // Log failed integration
      await this.logIntegration(
        ticketId,
        null,
        "status_update",
        "error",
        {
          ticketStatus,
          updateData,
        },
        null,
        error.message
      );

      throw error;
    }
  }

  /**
   * Sync ticket to Cedar (create or update based on current state)
   * @param {number} ticketId - Ticket ID
   * @param {string} action - Action performed on ticket
   * @param {Object} actionData - Action data
   * @returns {Object} Integration result
   */
  async syncTicketToCedar(ticketId, action, actionData = {}) {
    try {
      // Get ticket information with Person data for accepted_by and created_by
      const ticketResult = await this.pool
        .request()
        .input("ticketId", sql.Int, ticketId).query(`
                    SELECT t.*, 
                           pu.PUCODE, pu.PUNAME, pu.COSTCENTERNO, pu.DEPTNO,
                           accepted_person.DEPTNO as ACCEPTED_DEPTNO,
                           created_person.DEPTNO as CREATED_DEPTNO,
                           created_person.FIRSTNAME as CREATED_FIRSTNAME,
                           created_person.LASTNAME as CREATED_LASTNAME
                    FROM IgxTickets t
                    LEFT JOIN PU pu ON t.puno = pu.PUNO
                    LEFT JOIN Person accepted_person ON t.accepted_by = accepted_person.PERSONNO
                    LEFT JOIN Person created_person ON t.created_by = created_person.PERSONNO
                    WHERE t.id = @ticketId
                `);

      const ticket = ticketResult.recordset[0];
      if (!ticket) {
        throw new Error("Ticket not found");
      }
      
      // WO is created only when ticket is accepted (action = 'accept')
      if (action === "accept" && !ticket.cedar_wono) {
        console.log(
          `🔄 Creating Cedar WO for ticket ${ticketId} (action: ${action})`
        );
        return await this.createWorkOrder({
          ticketId: ticket.id,
          title: ticket.title,
          description: ticket.description,
          puno: ticket.puno,
          equipmentId: ticket.equipment_id,
          severityLevel: ticket.severity_level,
          priorityLevel: ticket.priority,
          pucode: ticket.PUCODE,
          puname: ticket.PUNAME,
          acceptedBy: ticket.accepted_by,
          acceptedAt: ticket.accepted_at,
          createdAt: ticket.created_at,
          reportedBy: ticket.created_by,
          scheduledFinish: ticket.schedule_finish,
          costCenterNo: ticket.COSTCENTERNO,
          // New Person table data
          acceptedDeptNo: ticket.ACCEPTED_DEPTNO,
          createdDeptNo: ticket.CREATED_DEPTNO,
          createdFirstName: ticket.CREATED_FIRSTNAME,
          createdLastName: ticket.CREATED_LASTNAME,
        });
      } else if (ticket.cedar_wono) {
        // Update existing WO status for other actions (including 'plan' and 'start')
        console.log(
          `🔄 Updating Cedar WO ${ticket.cedar_wono} (action: ${action})`
        );
        return await this.updateWorkOrderStatus(
          ticketId,
          ticket.status,
          actionData
        );
      } else {
        // No WO exists and action is not 'accept' - this is normal for open tickets
        console.log(
          `ℹ️ No Cedar WO exists for ticket ${ticketId} (action: ${action}) - this is normal for open tickets`
        );
        return {
          success: true,
          message:
            "No Cedar WO exists - WO will be created when ticket is accepted",
          wono: null,
          wocode: null,
        };
      }
    } catch (error) {
      console.error(
        `❌ Failed to sync ticket ${ticketId} to Cedar:`,
        error.message
      );
      throw error;
    }
  }

  /**
   * Get Work Order status from Cedar CMMS
   * @param {number} wono - Work Order number
   * @returns {Object} WO status information
   */
  async getWorkOrderStatus(wono) {
    try {
      const result = await this.pool.request().input("wono", sql.Int, wono)
        .query(`
                    SELECT WONO, WOCODE, WOStatusNo, WFStatusCode, 
                           SCH_START_D, SCH_START_T, SCH_FINISH_D, SCH_FINISH_T,
                           ACT_START_D, ACT_START_T, ACT_FINISH_D, ACT_FINISH_T,
                           WORKBY, TaskProcedure, WO_CAUSE, WO_PROBLEM
                    FROM WO 
                    WHERE WONO = @wono
                `);

      if (result.recordset.length === 0) {
        throw new Error("Work Order not found");
      }

      const wo = result.recordset[0];

      return {
        success: true,
        wono: wo.WONO,
        wocode: wo.WOCODE,
        woStatusNo: wo.WOStatusNo,
        wfStatusCode: wo.WFStatusCode,
        schedule: {
          startDate: wo.SCH_START_D,
          startTime: wo.SCH_START_T,
          finishDate: wo.SCH_FINISH_D,
          finishTime: wo.SCH_FINISH_T,
        },
        actual: {
          startDate: wo.ACT_START_D,
          startTime: wo.ACT_START_T,
          finishDate: wo.ACT_FINISH_D,
          finishTime: wo.ACT_FINISH_T,
        },
        workBy: wo.WORKBY,
        taskProcedure: wo.TaskProcedure,
        woCause: wo.WO_CAUSE,
        woProblem: wo.WO_PROBLEM,
      };
    } catch (error) {
      console.error(`❌ Failed to get Cedar WO ${wono} status:`, error.message);
      throw error;
    }
  }

  // Helper Methods

  /**
   * Get current date/time in Cedar format
   */
  getCurrentDateTime() {
    const now = new Date();
    const date =
      now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, "0") +
      now.getDate().toString().padStart(2, "0");
    const time =
      now.getHours().toString().padStart(2, "0") +
      now.getMinutes().toString().padStart(2, "0") +
      now.getSeconds().toString().padStart(2, "0");
    return { date, time };
  }

  getStrDate(date) {
    return (
      date.getFullYear().toString() +
      (date.getMonth() + 1).toString().padStart(2, "0") +
      date.getDate().toString().padStart(2, "0")
    );
  }
  getStrTime(time) {
    return (
      time.getHours().toString().padStart(2, "0") +
      time.getMinutes().toString().padStart(2, "0") +
      time.getSeconds().toString().padStart(2, "0")
    );
  }
  /**
   * Prepare Work Order data for creation
   */
  prepareWorkOrderData(ticketData, currentDate, currentTime) {
    // Build requester name from Person table data
    const requesterName =
      ticketData.createdFirstName && ticketData.createdLastName
        ? `${ticketData.createdFirstName} ${ticketData.createdLastName}`
        : "";

    return {
      // Basic WO information
      woProblem: ticketData.title,
      woPlan: "",
      woCause: "",
      deptNo: ticketData.acceptedDeptNo, // Use accepted_by DEPTNO from Person table
      woTypeNo: 16, // Walk by type
      puNo: ticketData.puno,
      eqNo: ticketData.equipmentId || 0,
      costCenterNo: ticketData.costCenterNo, // Default cost center
      priorityNo: this.mapPriorityToCedar(ticketData.priorityLevel),
      updateUser: ticketData.acceptedBy,
      assignedTo: ticketData.acceptedBy,
      receivePersonNo: ticketData.reportedBy,
      siteNo: 3, // MARS site
      schDuration: 120, // Default 2 hours
      requesterName: requesterName, // Use created_by FIRSTNAME + LASTNAME from Person table
      reqPhone: ticketData.reqPhone || "",
      reqEmail: ticketData.reqEmail || "",
      currentDate,
      currentTime,
      // Additional Person table data
      reqDeptNo: ticketData.createdDeptNo || ticketData.deptNo, // Use created_by DEPTNO from Person table
    };
  }

  /**
   * Set Work Order parameters for sp_WOMain_Insert
   */
  setWorkOrderParameters(request, woData) {
    // Set all required parameters for sp_WOMain_Insert
    request.input("WOCode", sql.VarChar(20), null);
    request.input("WODate", sql.VarChar(8), woData.currentDate);
    request.input("WOTime", sql.VarChar(8), woData.currentTime);
    request.input("WRNo", sql.Int, 0);
    request.input("WRCode", sql.NVarChar(20), "");
    request.input("WRDate", sql.NVarChar(8), "");
    request.input("WRTime", sql.NVarChar(8), "");
    request.input("Text1", sql.NVarChar(50), "");
    request.input("Text2", sql.NVarChar(50), "");
    request.input("Text3", sql.NVarChar(50), "");
    request.input("PriorityNo", sql.Int, woData.priorityNo);
    request.input("DeptNo", sql.Int, woData.deptNo);
    request.input("WoTypeNo", sql.Int, woData.woTypeNo);
    request.input("PUNo", sql.Int, woData.puNo);
    request.input("EQTypeNo", sql.Int, 0);
    request.input("EQNo", sql.Int, woData.eqNo);
    request.input("CostCenterNo", sql.Int, woData.costCenterNo);
    request.input("VendorNo", sql.Int, 0);
    request.input("ContrNo", sql.Int, 0);
    request.input("BudgetNo", sql.Int, 0);
    request.input("PJNo", sql.Int, 0);
    request.input("UpdateUser", sql.Int, woData.updateUser);
    request.input("SiteNo", sql.Int, woData.siteNo);
    request.input("HotWork", sql.NVarChar(1), "F");
    request.input("ConfineSpace", sql.NVarChar(1), "F");
    request.input("WorkAtHeight", sql.NVarChar(1), "F");
    request.input("LockOutTagOut", sql.NVarChar(1), "F");
    request.input("SchCurrentStartDate", sql.NVarChar(8), "");
    request.input("SchStartDate", sql.NVarChar(8), "");
    request.input("SchStartTime", sql.NVarChar(8), "");
    request.input("SchFinishDate", sql.NVarChar(8), "");
    request.input("SchFinishTime", sql.NVarChar(8), "");
    request.input("SchDuration", sql.Float, 0);
    request.input("AssignToNo", sql.Int, woData.assignedTo);
    request.input("SchChangeNote", sql.NVarChar(250), "");
    request.input("MeterNo", sql.Int, 0);
    request.input("MeterDone", sql.Float, 0);
    request.input("WO_PROBLEM", sql.NVarChar(sql.MAX), woData.woProblem);
    request.input("WoNo", sql.Int, 0); // INOUT parameter
    request.input("FlagPU", sql.VarChar(1), "T");
    request.input("FlagSafety", sql.NVarChar(1), "F");
    request.input("FlagEnvironment", sql.NVarChar(1), "F");
    request.input("PUNO_Effected", sql.Int, 0);
    request.input("DT_Start_D", sql.NVarChar(8), "");
    request.input("DT_Start_T", sql.NVarChar(8), "");
    request.input("DT_Finish_D", sql.NVarChar(8), "");
    request.input("DT_Finish_T", sql.NVarChar(8), "");
    request.input("DT_Duration", sql.Float, 0);
    request.input("UrgentNo", sql.Int, 0);
    request.input("DATE_REQ", sql.NVarChar(8), woData.currentDate);
    request.input("Time_REQ", sql.NVarChar(8), woData.currentTime);
    request.input("RequesterName", sql.NVarChar(100), woData.requesterName);
    request.input("REQ_PHONE", sql.NVarChar(20), woData.reqPhone);
    request.input("DEPT_REQ", sql.Int, woData.reqDeptNo);
    request.input("Receiver", sql.Int, woData.updateUser);
    request.input("ProcedureNo", sql.Int, 0);
    request.input("SymptomNo", sql.Int, 0);
    request.input("WOSubTypeNo", sql.Int, 0);
    request.input("REQ_Email", sql.NVarChar(50), woData.reqEmail);
    request.input("TaskProcedure", sql.NVarChar(2000), woData.woPlan);
    request.input("FlagEQ", sql.NVarChar(1), "T");
    request.input("WarrantyDate", sql.NVarChar(8), "");
    request.input("WOCause", sql.NVarChar(sql.MAX), woData.woCause);
    request.input("Note", sql.NVarChar(100), "");
    request.input("RecordActualBy", sql.Int, 0);
    request.input("RecordActualDate", sql.NVarChar(8), "");
    request.input("RecordActualTime", sql.NVarChar(8), "");
    request.input("FlagTPM", sql.NVarChar(1), "F");
    request.input("TPMNo", sql.Int, 0);
    request.input("EQCompNo", sql.Int, null);
    request.input("WOPlan", sql.NVarChar(sql.MAX), woData.woPlan);
    request.input("AssignRemark", sql.NVarChar(1000), "");
    request.input("SchCurrentFinishDate", sql.NVarChar(8), null);
    request.input("AccNo", sql.Int, null);
    request.input("JsaType", sql.Int, null);
    request.input("JsaNo", sql.NVarChar(100), null);
    request.input("FlagCleaningJobFinish", sql.NVarChar(1), "F");
    request.input("FlagCleaningJobFinishNotReq", sql.NVarChar(1), "F");
    request.input("FlagHandoverOper", sql.NVarChar(1), "F");
    request.input("FlagHandoverOperNotReq", sql.NVarChar(1), "F");
  }

  /**
   * Get status mapping for ticket status
   * Based on updated wostatusno.json mapping
   */
  getStatusMapping(ticketStatus) {
    const statusMappings = {
      open: { woStatusNo: 1, wfStatusCode: "10" }, // Initial status - no WO created yet
      accepted: { woStatusNo: 1, wfStatusCode: "10" }, // NEW: WO created when accepted
      planed: { woStatusNo: 3, wfStatusCode: "30" }, // NEW: Planning phase
      in_progress: { woStatusNo: 4, wfStatusCode: "50" }, // Work in progress
      finished: { woStatusNo: 5, wfStatusCode: "70" },
      reviewed: { woStatusNo: 6, wfStatusCode: "80" }, // Updated from 90 to 80
      closed: { woStatusNo: 9, wfStatusCode: "99" },
      rejected_final: { woStatusNo: 8, wfStatusCode: "95" },
      cancelled: { woStatusNo: 8, wfStatusCode: "95" }, // Same as rejected
    };

    return statusMappings[ticketStatus];
  }

  /**
   * Prepare status update fields based on ticket status
   */
  prepareStatusUpdateFields(ticketStatus, updateData, ticket) {
    const { date: currentDate, time: currentTime } = this.getCurrentDateTime();
    const statusMapping = this.getStatusMapping(ticketStatus);

    const updateFields = [
      {
        name: "updateUser",
        type: sql.Int,
        field: "UPDATEUSER",
        value: updateData.changedBy || 1,
      },
      {
        name: "updateDate",
        type: sql.NVarChar,
        field: "UPDATEDATE",
        value: currentDate,
      },
      {
        name: "updateTime",
        type: sql.NVarChar,
        field: "UpdateTime",
        value: currentTime,
      },
    ];

    // Add status-specific fields
    if (statusMapping) {
      updateFields.push(
        {
          name: "woStatusNo",
          type: sql.Int,
          field: "WOStatusNo",
          value: statusMapping.woStatusNo,
        },
        {
          name: "wfStatusCode",
          type: sql.NVarChar,
          field: "WFStatusCode",
          value: statusMapping.wfStatusCode,
        }
      );
    }

    // Add status-specific fields based on ticket status
    switch (ticketStatus) {
      case "planed":
        // Update scheduling fields for planning phase
        const scheduleStart =
          updateData.scheduleStart ||
          updateData.schedule_start ||
          ticket.schedule_start;
        const scheduleFinish =
          updateData.scheduleFinish ||
          updateData.schedule_finish ||
          ticket.schedule_finish;
        const assignedTo =
          updateData.assignedTo || updateData.assigned_to || ticket.assigned_to;

        if (scheduleStart && scheduleFinish && assignedTo) {
          const startDate = new Date(scheduleStart);
          const finishDate = new Date(scheduleFinish);

          const startDateStr = this.getStrDate(startDate);
          const startTimeStr = this.getStrTime(startDate);
          const finishDateStr = this.getStrDate(finishDate);
          const finishTimeStr = this.getStrTime(finishDate);

          updateFields.push(
            {
              name: "schStartDate",
              type: sql.NVarChar,
              field: "SCH_START_D",
              value: startDateStr,
            },
            {
              name: "schStartTime",
              type: sql.NVarChar,
              field: "SCH_START_T",
              value: startTimeStr,
            },
            {
              name: "schFinishDate",
              type: sql.NVarChar,
              field: "SCH_FINISH_D",
              value: finishDateStr,
            },
            {
              name: "schFinishTime",
              type: sql.NVarChar,
              field: "SCH_FINISH_T",
              value: finishTimeStr,
            },
            {
              name: "assignTo",
              type: sql.Int,
              field: "ASSIGN",
              value: assignedTo,
            },
            {
              name: "repairBy",
              type: sql.Int,
              field: "REPAIRBY",
              value: assignedTo,
            },
            {
              name: "workBy",
              type: sql.Int,
              field: "WORKBY",
              value: assignedTo,
            },
            {
                name: "assignUser",
                type: sql.Int,
                field: "AssignUser",
                value: assignedTo,
            },
            {
                name: "assignDate",
                type: sql.NVarChar,
                field: "AssignDate",
                value: currentDate,
            }
          );
        }
        break;

      case "in_progress":
        // Use actual_start_at from ticket or updateData
        const actualStartAt =
          updateData.actualStartAt || ticket.actual_start_at;
        if (actualStartAt) {
          const startDate = new Date(actualStartAt);
          const startDateStr = this.getStrDate(startDate);
          const startTimeStr = this.getStrTime(startDate);

          updateFields.push(
            {
              name: "actStartDate",
              type: sql.NVarChar,
              field: "ACT_START_D",
              value: startDateStr,
            },
            {
              name: "actStartTime",
              type: sql.NVarChar,
              field: "ACT_START_T",
              value: startTimeStr,
            },
            {
              name: "workBy",
              type: sql.Int,
              field: "WORKBY",
              value: ticket.assigned_to || updateData.changedBy,
            }
          );
        }
        break;

      case "finished":
        // Use actual_finish_at from updateData or ticket, fallback to finished_at
        const actualFinishAt =
          updateData.actualFinishAt ||
          ticket.actual_finish_at ||
          ticket.finished_at;
        if (actualFinishAt) {
          const finishDate = new Date(actualFinishAt);
          const finishDateStr = this.getStrDate(finishDate);
          const finishTimeStr = this.getStrTime(finishDate);

          updateFields.push(
            {
              name: "actFinishDate",
              type: sql.NVarChar,
              field: "ACT_FINISH_D",
              value: finishDateStr,
            },
            {
              name: "actFinishTime",
              type: sql.NVarChar,
              field: "ACT_FINISH_T",
              value: finishTimeStr,
            },
            {
              name: "completeUser",
              type: sql.Int,
              field: "COMPLETEUSER",
              value: updateData.changedBy,
            },
            {
              name: "completeDate",
              type: sql.NVarChar,
              field: "COMPLETEDATE",
              value: finishDateStr,
            },
            {
              name: "completeTime",
              type: sql.NVarChar,
              field: "COMPLETE_TIME",
              value: finishTimeStr,
            }
          );
        }

        // Also update actual start time if provided in updateData
        const actualStartAtFinish =
          updateData.actualStartAt || ticket.actual_start_at;
        if (actualStartAtFinish) {
          const startDate = new Date(actualStartAtFinish);
          const startDateStr = this.getStrDate(startDate);
          const startTimeStr = this.getStrTime(startDate);

          updateFields.push(
            {
              name: "actStartDate",
              type: sql.NVarChar,
              field: "ACT_START_D",
              value: startDateStr,
            },
            {
              name: "actStartTime",
              type: sql.NVarChar,
              field: "ACT_START_T",
              value: startTimeStr,
            }
          );
        }
        break;

      case "reviewed":
        // Add satisfaction rating if provided
        // if (updateData.satisfactionRating) {
        //     updateFields.push(
        //         { name: 'satisfactionRating', type: sql.Int, field: 'SATISFACTION_RATING', value: updateData.satisfactionRating }
        //     );
        // }
        // // Add review date/time
        // updateFields.push(
        //     { name: 'reviewDate', type: sql.NVarChar, field: 'REVIEW_DATE', value: currentDate },
        //     { name: 'reviewTime', type: sql.NVarChar, field: 'REVIEW_TIME', value: currentTime }
        // );
        break;

      case "closed":
        updateFields.push(
          { name: "flagHis", type: sql.VarChar, field: "FLAGHIS", value: "T" },
          {
            name: "acceptDate",
            type: sql.NVarChar,
            field: "ACCEPTDATE",
            value: currentDate,
          },
          {
            name: "acceptTime",
            type: sql.NVarChar,
            field: "ACCEPT_TIME",
            value: currentTime,
          },
          {
            name: "acceptNote",
            type: sql.NVarChar,
            field: "ACCEPT_NOTE",
            value: updateData.notes,
          },
          {
            name: "acceptUser",
            type: sql.Int,
            field: "ACCEPTUSER",
            value: updateData.changedBy,
          },
          {
            name: "hisDate",
            type: sql.NVarChar,
            field: "HIS_DATE",
            value: currentDate,
          },
          {
            name: "hisTime",
            type: sql.NVarChar,
            field: "HIS_TIME",
            value: currentTime,
          }
        );
        break;
    }

    return updateFields;
  }

  /**
   * Map priority level to Cedar priority number
   */
  mapPriorityToCedar(priorityLevel) {
    const priorityMapping = {
      low: 4,
      normal: 3,
      high: 2,
      urgent: 1,
    };

    return priorityMapping[priorityLevel] || 3; // Default to normal
  }

  /**
   * Update ticket with Cedar integration information
   */
  async updateTicketWithCedarInfo(
    ticketId,
    wono,
    wocode,
    syncStatus,
    errorMessage = null
  ) {
    try {
      const updateRequest = this.pool
        .request()
        .input("ticketId", sql.Int, ticketId)
        .input("cedarWono", sql.Int, wono)
        .input("cedarWocode", sql.NVarChar(20), wocode)
        .input("cedarSyncStatus", sql.VarChar(20), syncStatus)
        .input("cedarLastSync", sql.DateTime2, new Date())
        .input("cedarSyncError", sql.NVarChar(500), errorMessage);

      await updateRequest.query(`
                UPDATE IgxTickets 
                SET cedar_wono = @cedarWono,
                    cedar_wocode = @cedarWocode,
                    cedar_sync_status = @cedarSyncStatus,
                    cedar_last_sync = @cedarLastSync,
                    cedar_sync_error = @cedarSyncError
                WHERE id = @ticketId
            `);
    } catch (error) {
      console.error("Failed to update ticket Cedar info:", error.message);
    }
  }

  /**
   * Log integration activity
   */
  async logIntegration(
    ticketId,
    wono,
    action,
    status,
    requestData,
    responseData,
    errorMessage = null
  ) {
    try {
      const logRequest = this.pool
        .request()
        .input("ticketId", sql.Int, ticketId)
        .input("wono", sql.Int, wono)
        .input("action", sql.VarChar(50), action)
        .input("status", sql.VarChar(20), status)
        .input(
          "requestData",
          sql.NVarChar(sql.MAX),
          JSON.stringify(requestData)
        )
        .input(
          "responseData",
          sql.NVarChar(sql.MAX),
          responseData ? JSON.stringify(responseData) : null
        )
        .input("errorMessage", sql.NVarChar(500), errorMessage)
        .input("createdAt", sql.DateTime2, new Date())
        .input("createdBy", sql.Int, 1); // System user

      await logRequest.query(`
                INSERT INTO IgxCedarIntegrationLog 
                (ticket_id, wono, action, status, request_data, response_data, error_message, created_at, created_by)
                VALUES (@ticketId, @wono, @action, @status, @requestData, @responseData, @errorMessage, @createdAt, @createdBy)
            `);
    } catch (error) {
      console.error("Failed to log integration:", error.message);
    }
  }
}

module.exports = new CedarIntegrationService();
