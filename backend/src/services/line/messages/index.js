const ticketCreated = require('./ticketCreated');
const ticketAssigned = require('./ticketAssigned');
const ticketStatusUpdate = require('./ticketStatusUpdate');
const ticketPreAssigned = require('./ticketPreAssigned');
const ticketAccepted = require('./ticketAccepted');
const ticketRejected = require('./ticketRejected');
const ticketCompleted = require('./ticketCompleted');
const ticketEscalated = require('./ticketEscalated');
const ticketClosed = require('./ticketClosed');
const ticketReopened = require('./ticketReopened');
const ticketReassigned = require('./ticketReassigned');

module.exports = {
  ...ticketCreated,
  ...ticketAssigned,
  ...ticketStatusUpdate,
  ...ticketPreAssigned,
  ...ticketAccepted,
  ...ticketRejected,
  ...ticketCompleted,
  ...ticketEscalated,
  ...ticketClosed,
  ...ticketReopened,
  ...ticketReassigned,
};
