const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const EventManagerModule = buildModule("EventManager", (m) => {
    const eventManager = m.contract("EventManager");
    return { eventManager };
});

module.exports = EventManagerModule