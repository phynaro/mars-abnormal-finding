###Project Objectives###
• Enable all plant users to eLiciently report abnormal findings in real time.
• Automate ticket/case creation and workflow management for abnormal issues.
• Enhance accountability and visibility through role-based permissions and
notifications.
• Provide actionable insights via dashboards and performance metrics.
• Integrate with the Cedar CMMS Windows application (backed by Microsoft SQL
Server) without disrupting existing operations.

###Scope of Work###
Application Platform
The solution will be a web-based application, accessible via modern browsers within the
local plant network. It will be hosted on-premises, allowing for fast access and data
security.

###User Roles & Permissions###
The system will establish three primary user groups, each with custom permissions:
• L1: Operators – Can report issues, upload images, and view assigned tickets.
• L2: Engineers and Technicians – Can review and action tickets, update status and
comments, and view performance data.
• L3: Managers – Full oversight, ability to assign/reassign cases, view analytics and
history, and configure system parameters.
Role assignment and permission control will be managed through a secure administration
module.

###Reporting Abnormal Findings###
• Users log in using individualized credentials.
• On the main dashboard, users initiate a new report by selecting the machine, area,
or equipment where the abnormal finding is observed.
• Each report (ticket) includes:
- Description of the abnormality
- Selection of the aLected point (machine, area, equipment)
- Image upload (before and after, if applicable)
- Additional notes or observations
- Estimate Downtime
Upon submission, the system automatically generates a ticket number and logs time, user,
and location details.

###Workflow Automation & Notifications###
The application will implement a ticket workflow that dictates the sequence of actions
required to resolve each abnormal finding:
• Automated assignment or manual allocation based on issue type and user role
• Notification triggers via LINE OA and email for each stage:
- Ticket creation
- Assignment to responsible party
- Updates and changes in status
- Resolution and closure
Escalation rules for overdue or unresolved issues
Notifications will ensure timely awareness and prompt action from all stakeholders.

###Dashboard and Performance Analytics###
The dashboard will provide a visual summary of current and historical cases with
interactive elements:
• Real-time count of open, closed, and in-progress tickets
• Performance metrics:
• Resolution time by issue type, location, or user/group
• Case distribution by machine/area
• Top-performing individuals and teams
• Historical trends and patterns
Filters for user roles, dates, status, severity, and other relevant attributes
Drill-down capability to view ticket details and case history
Managers will be able to export data for reporting and continuous improvement initiatives.

###Audit Trail & History###
All actions within the application will be logged with comprehensive audit trails. Users will
be able to review the full history of each case, including all status changes, comments,
images, and user actions, supporting transparency and compliance.

###Integration with Cedar CMMS###
A key requirement is the integration of the new web application with the factory’s existing
Cedar CMMS platform, which operates as a Windows application utilizing Microsoft SQL
Server. The integration will involve:
• Design and implementation of an API layer (RESTful or SOAP, based on
compatibility) to facilitate secure CRUD (Create, Read, Update, Delete) operations
with the Cedar database.
• Mapping of ticket data to existing CMMS tables and structures.
• Synchronization processes to avoid data conflicts and redundancy, ensuring both
systems can operate concurrently.
• Robust error handling and transaction management.
• Security protocols to preserve data integrity and confidentiality.
This approach maintains the usability of the legacy Cedar application while extending its
functionality through web-based reporting and analytics.

###Technical Approach###

System Architecture
• Modern web application stack (React for frontend, Node.js for backend API)
• Secure user authentication and authorization ( JWT)
• Image storage in local server
• Integration service layer to interface with Cedar's SQL Server database
• Notification service (LINE OA API, SMTP for email)
• Role-based access control and admin configuration