import { expect } from 'chai';
import { ethers, network } from 'hardhat';
import hre from 'hardhat';

describe('EventManager', function () {

    let eventName = "Event-1";
    let ticketLimit = 1;
    let priceInEther = 1;
    let timestampInFuture = 1758287340;

    let eventId = "ev1";
    let fname = "John";
    let lname = "Connor";
    let email = "john.connor@terminator.io";



    async function deployContractFixture() {
        const [owner, addr1, addr2] = await ethers.getSigners();
        const EventManager = await hre.ethers.getContractFactory('EventManager');
        const eventManager = await EventManager.deploy();
        return { eventManager, owner, addr1, addr2 };
    };

    describe('admin modifier', async function () {

        it('should produce an error when a non contract owner tries to list event participants', async () => {
            const { eventManager, addr1 } = await deployContractFixture();
            await eventManager.createEvent(eventName, ticketLimit, priceInEther, timestampInFuture);
            await eventManager.connect(addr1).buyTicket(eventId, fname, lname, email, { value: hre.ethers.parseEther("2") });
            await expect(eventManager.connect(addr1).listEventParticipants("ev1")).to.be.revertedWith("Access denied! You must be the owner of this contract.");
        });

        it('should produce an error when a non contract owner tries to create an event', async () => {
            const { eventManager, addr1 } = await deployContractFixture();
            await expect(eventManager.connect(addr1).createEvent(eventName, ticketLimit, priceInEther, timestampInFuture)).to.be.revertedWith("Access denied! You must be the owner of this contract.");
        });

        it('should produce an error when a non contract owner tries to toggle the pause status of an event', async () => {
            const { eventManager, addr1 } = await deployContractFixture();
            await eventManager.createEvent(eventName, ticketLimit, priceInEther, timestampInFuture);
            await expect(eventManager.connect(addr1).togglePauseEventRegistration("ev1", 1)).to.be.revertedWith("Access denied! You must be the owner of this contract.");
        });

        it('should prouce an error when a non contract owner tries to view the contract balance', async () => {
            const { eventManager, addr1 } = await deployContractFixture();
            await expect(eventManager.connect(addr1).getContractBalance()).to.be.revertedWith("Access denied! You must be the owner of this contract.");
        });

    });

    describe('createEvent', async function () {

        it('should produce an error when timestamp is set in the past [require]', async () => {
            const timestampInPast = 0;
            const { eventManager } = await deployContractFixture();
            await expect(eventManager.createEvent(eventName, ticketLimit, priceInEther, timestampInPast)).to.be.revertedWith("Cannot set a timestamp in the past. Try again with a UNIX Timestamp in the future.");
        });

        it('should emit "NewEventCreated" when a an event was created', async () => {
            const { eventManager } = await deployContractFixture();
            await expect(eventManager.createEvent(eventName, ticketLimit, priceInEther, timestampInFuture)).to.emit(eventManager, 'NewEventCreated');
        });


    });

    describe('listEvents', async function () {
        it('should return an empty array', async () => {
            const { eventManager } = await deployContractFixture();
            expect(await eventManager.listEvents()).to.be.empty;
        });

        it('should return an array with one event', async () => {
            const { eventManager } = await deployContractFixture();
            await eventManager.createEvent(eventName, ticketLimit, priceInEther, timestampInFuture);
            expect(await eventManager.listEvents()).to.be.not.empty;
        });

        it('should return an event with an id of ev1', async () => {
            const { eventManager } = await deployContractFixture();
            await eventManager.createEvent(eventName, ticketLimit, priceInEther, timestampInFuture);
            const eventsIdList = await eventManager.listEvents()
            expect(eventsIdList[0]).to.be.equal("ev1");
        });
    });

    describe('showEventDetails', async () => {

        it('should produce an error when an event wasn\'t found', async () => {
            const { eventManager } = await deployContractFixture();
            await expect(eventManager.showEventDetails("")).to.be.revertedWithCustomError(eventManager, "NoEventFound");
        });

        it('should return a tuple with the event details', async () => {

            const { eventManager, owner } = await deployContractFixture();
            await eventManager.createEvent(eventName, ticketLimit, priceInEther, timestampInFuture);
            const [_eventId, _creator, _name, _ticketLimit, _price, _eventDate, _status] = await eventManager.showEventDetails("ev1");
            const priceInWei = hre.ethers.parseEther(priceInEther.toString());

            expect(_eventId).to.be.equal("ev1");
            expect(_creator).to.be.equal(owner);
            expect(_name).to.be.equal(eventName);
            expect(_ticketLimit).to.be.equal(ticketLimit);
            expect(_price).to.be.equal(priceInWei);
            expect(_eventDate).to.be.equal(timestampInFuture);
            expect(_status).to.equal(0);
        });

    });

    describe('listEventParticipants', async () => {
        it('should produce an error when an ID is not provided [require]', async () => {
            const { eventManager } = await deployContractFixture();
            await expect(eventManager.listEventParticipants("")).to.be.revertedWith("Event ID cannot be empty");
        });

        it('should return an array with participants', async () => {
            const { eventManager, addr1 } = await deployContractFixture();
            await eventManager.createEvent(eventName, ticketLimit, priceInEther, timestampInFuture);
            await eventManager.connect(addr1).buyTicket(eventId, fname, lname, email, { value: hre.ethers.parseEther("2") });
            const participants = await eventManager.listEventParticipants("ev1");
            expect(participants).to.not.be.empty;
        });
    });

    describe('togglePauseEventRegistration', async () => {
        it('should produce an error when an event doesnt exist with a specific ID [require]', async () => {
            const { eventManager } = await deployContractFixture();
            await expect(eventManager.togglePauseEventRegistration("wrong-id", 1)).to.be.revertedWith("No event with that ID was found");
        });

        it('should produce an error when the event status is already set to the requested update [require]', async () => {
            const { eventManager } = await deployContractFixture();
            const newStatus = 0; // Enum: 0 = Active (Standard value), 1 = Paused
            await eventManager.createEvent(eventName, ticketLimit, priceInEther, timestampInFuture);
            await expect(eventManager.togglePauseEventRegistration("ev1", newStatus)).to.be.revertedWith("That status is already set");
        });

        it('should update the status of the event to 1 (Paused)', async () => {
            const { eventManager } = await deployContractFixture();
            const newStatus = 1; // Enum: 0 = Active (Standard value), 1 = Paused
            await eventManager.createEvent(eventName, ticketLimit, priceInEther, timestampInFuture);
            await expect(eventManager.togglePauseEventRegistration("ev1", newStatus)).to.emit(eventManager, "EventStatusUpdated");
        });

    });

    describe('buyTicket', async () => {
        let snapshotId: any;

        beforeEach(async () => {
            snapshotId = await network.provider.request({
                method: "evm_snapshot",
                params: []
            });
        });

        afterEach(async () => {
            await network.provider.request({
                method: "evm_revert",
                params: [snapshotId]
            });
        });

        it('should produce an error when no event was found with the provided ID [require]', async () => {
            const { eventManager, addr1 } = await deployContractFixture();
            await expect(eventManager.connect(addr1).buyTicket("1337", fname, lname, email, { value: hre.ethers.parseEther("2") })).to.be.revertedWithCustomError(eventManager, "NoEventFound");
        });

        it('should produce an error if the organier tries to buy a ticket to its own event [require]', async () => {
            const { eventManager } = await deployContractFixture();
            await eventManager.createEvent(eventName, ticketLimit, priceInEther, timestampInFuture);
            await expect(eventManager.buyTicket(eventId, fname, lname, email, { value: hre.ethers.parseEther("2") })).to.be.revertedWithCustomError(eventManager, "OrganizerCannotBuyTicket");
        });

        it('should produce an error if user tries to buy another ticket for same event [require]', async () => {
            const { eventManager, addr1 } = await deployContractFixture();
            await eventManager.createEvent(eventName, ticketLimit, priceInEther, timestampInFuture);
            await eventManager.connect(addr1).buyTicket(eventId, fname, lname, email, { value: hre.ethers.parseEther("2") });
            await expect(eventManager.connect(addr1).buyTicket(eventId, fname, lname, email, { value: hre.ethers.parseEther("2") })).to.be.revertedWithCustomError(eventManager, "TicketAlreadyExists");
        });

        it('should produce an error if user tries to buy a ticket after the event has ended [require]', async () => {
            const timestampAddition = 1695128940;
            const { eventManager, addr1 } = await deployContractFixture();
            await eventManager.createEvent(eventName, ticketLimit, priceInEther, timestampInFuture);

            // Move time into the future of the events timestamp
            await hre.network.provider.request({
                method: "evm_setNextBlockTimestamp",
                params: [timestampInFuture + timestampAddition]
            });
            await hre.network.provider.send('evm_mine');

            await expect(eventManager.connect(addr1).buyTicket(eventId, fname, lname, email, { value: hre.ethers.parseEther("2") })).to.be.revertedWithCustomError(eventManager, "PassedEventDate");
        });

        it('should produce an error if user tries to buy a ticket after the event has been paused [require]', async () => {
            const { eventManager, addr1 } = await deployContractFixture();
            await eventManager.createEvent(eventName, ticketLimit, priceInEther, timestampInFuture);
            await eventManager.togglePauseEventRegistration(eventId, 1); // Enum: 0 = Active (Standard value), 1 = Paused
            await expect(eventManager.connect(addr1).buyTicket(eventId, fname, lname, email, { value: hre.ethers.parseEther("2") })).to.be.revertedWithCustomError(eventManager, "EventPaused");
        });

        it('should produce an error if user tries to buy a ticket after the event has been sold out [require]', async () => {
            const { eventManager, addr1 } = await deployContractFixture();
            await eventManager.createEvent(eventName, 0, priceInEther, timestampInFuture);
            await expect(eventManager.connect(addr1).buyTicket(eventId, fname, lname, email, { value: hre.ethers.parseEther("2") })).to.be.revertedWithCustomError(eventManager, "SoldOutTickets");
        });

        it('should produce an error if user tries to buy a ticket with an insufficient balance [require]', async () => {
            const { eventManager, addr1 } = await deployContractFixture();
            await eventManager.createEvent(eventName, ticketLimit, priceInEther, timestampInFuture);
            await expect(eventManager.connect(addr1).buyTicket(eventId, fname, lname, email, { value: hre.ethers.parseEther("0.5") })).to.be.revertedWithCustomError(eventManager, "NotEnoughFunds");
        });

        it('should emit "NewTicketCreated" when a ticket was bought', async () => {
            const { eventManager, addr1 } = await deployContractFixture();
            await eventManager.createEvent(eventName, ticketLimit, priceInEther, timestampInFuture);
            await expect(eventManager.connect(addr1).buyTicket(eventId, fname, lname, email, { value: hre.ethers.parseEther("2") })).to.emit(eventManager, "NewTicketCreated");
        });

        it('should refund any excess funds to the user', async () => {
            const { eventManager, addr1 } = await deployContractFixture();
            await eventManager.createEvent(eventName, ticketLimit, priceInEther, timestampInFuture);

            const initialBalance = await ethers.provider.getBalance(addr1);

            const tx = await eventManager.connect(addr1).buyTicket(
                eventId, fname, lname, email, { value: hre.ethers.parseEther("10") } // Overpay
            );

            const receipt = await tx.wait();

            if (!receipt) {
                throw new Error('Transaction receipt is null');
            }

            const totalGasPrice = receipt.gasUsed * receipt.gasPrice;
            const paidTicketPrice = hre.ethers.parseEther(priceInEther.toString());
            const totalTicketCost = paidTicketPrice + totalGasPrice;
            const expectedBalance = initialBalance - totalTicketCost;

            expect(expectedBalance).to.be.equal(await ethers.provider.getBalance(addr1));

        });

    });

    describe('getUserTicket', async () => {
        it('should return false when no event ID is found', async () => {
            const { eventManager, addr1 } = await deployContractFixture();
            const [ticketExist] = await eventManager.connect(addr1).getUserTicket(eventId);
            expect(ticketExist).to.be.false;
        });

        it('should return false when no ticket is found', async () => {
            const { eventManager, addr1 } = await deployContractFixture();
            await eventManager.createEvent(eventName, ticketLimit, priceInEther, timestampInFuture);
            const [ticketExist] = await eventManager.connect(addr1).getUserTicket(eventId);
            expect(ticketExist).to.be.false;
        });

        it('should return a ticket for an event', async () => {
            const { eventManager, addr1 } = await deployContractFixture();
            await eventManager.createEvent(eventName, ticketLimit, priceInEther, timestampInFuture);
            const tx = await eventManager.connect(addr1).buyTicket(eventId, fname, lname, email, { value: hre.ethers.parseEther("2") });
            const receipt = await tx.wait();

            if (!receipt) {
                throw new Error('Transaction receipt is null');
            }

            const blockNumber = receipt.blockNumber;
            const block = await hre.ethers.provider.getBlock(blockNumber);

            if (!block) {
                throw new Error('Block is null');
            }

            const [, ticketData] = await eventManager.connect(addr1).getUserTicket(eventId);


            expect(ticketData.owner).to.be.equal(addr1);
            expect(ticketData.fname).to.be.equal(fname);
            expect(ticketData.lname).to.be.equal(lname);
            expect(ticketData.email).to.be.equal(email);
            expect(ticketData.paidPrice).to.be.equal(hre.ethers.parseEther(priceInEther.toString()));
            expect(ticketData.purchased).to.be.equal(block.timestamp);

        });
    });

    describe('cancelTicket', async () => {
        let snapshotId: any;

        beforeEach(async () => {
            snapshotId = await network.provider.request({
                method: "evm_snapshot",
                params: []
            });
        });

        afterEach(async () => {
            await network.provider.request({
                method: "evm_revert",
                params: [snapshotId]
            });
        });

        it('should revert when no ticket was found', async () => {
            const { eventManager, addr1 } = await deployContractFixture();
            await expect(eventManager.connect(addr1).cancelTicket(eventId)).to.be.revertedWithCustomError(eventManager, "NoTicketFound");
        });

        it('should provide an error message when passed the refund date [require]', async () => {
            const refundTimestamp = 1758232800;
            const { eventManager, addr1 } = await deployContractFixture();
            await eventManager.createEvent(eventName, ticketLimit, priceInEther, timestampInFuture);
            await eventManager.connect(addr1).buyTicket(eventId, fname, lname, email, { value: hre.ethers.parseEther("2") });

            // Move time into the future of the events timestamp
            await hre.network.provider.request({
                method: "evm_setNextBlockTimestamp",
                params: [refundTimestamp]
            });
            await hre.network.provider.send('evm_mine');

            expect(eventManager.connect(addr1).cancelTicket(eventId)).to.be.revertedWith("Sorry, the last date for a refund have passed :(");

        });


        it('should refund the ticket price and emit "TicketCanceled"', async () => {
            const { eventManager, addr1 } = await deployContractFixture();
            await eventManager.createEvent(eventName, ticketLimit, priceInEther, timestampInFuture);
            await eventManager.connect(addr1).buyTicket(eventId, fname, lname, email, { value: hre.ethers.parseEther("2") });
            const [, ticketData] = await eventManager.connect(addr1).getUserTicket(eventId);

            const initialBalance = await ethers.provider.getBalance(addr1);
            const tx = await eventManager.connect(addr1).cancelTicket(eventId);
            const receipt = await tx.wait();

            if (!receipt) {
                throw new Error('Transaction receipt is null');
            }

            const totalGasPrice = receipt.gasUsed * receipt.gasPrice;
            const expectedBalance = initialBalance + ticketData.paidPrice - totalGasPrice;

            expect(expectedBalance).to.be.equal(await ethers.provider.getBalance(addr1));
            expect(tx).to.emit(eventManager, "TicketCanceled");
        });

    });

    describe('getContractBalance', async () => {
        it('should return the contract balance of 0', async () => {
            const { eventManager } = await deployContractFixture();
            expect(await eventManager.getContractBalance()).to.be.equal(0);
        });

        it('should return the contract balance of 1 ether in wei', async () => {
            const tempTicketPriceInEther = 1;
            const { eventManager, addr1 } = await deployContractFixture();
            await eventManager.createEvent(eventName, ticketLimit, tempTicketPriceInEther, timestampInFuture);
            await eventManager.connect(addr1).buyTicket(eventId, fname, lname, email, { value: hre.ethers.parseEther("2") });

            expect(await eventManager.getContractBalance()).to.be.equal(hre.ethers.parseEther(tempTicketPriceInEther.toString()));
        });

        it('should return the contract balance of 2 ether in wei', async () => {
            const tempTicketPriceInEther = 1;
            const { eventManager, addr1, addr2 } = await deployContractFixture();
            await eventManager.createEvent(eventName, 5, tempTicketPriceInEther, timestampInFuture);
            await eventManager.connect(addr1).buyTicket(eventId, fname, lname, email, { value: hre.ethers.parseEther("2") });
            await eventManager.connect(addr2).buyTicket(eventId, fname, lname, email, { value: hre.ethers.parseEther("2") });

            expect(await eventManager.getContractBalance()).to.be.equal(hre.ethers.parseEther("2"));
        });
    });

    describe('fallback', async () => {
        it('should emit the correct log when fallback function is called', async () => {
            const { eventManager, addr1 } = await deployContractFixture();
            await expect(
                addr1.sendTransaction({
                    to: eventManager.getAddress(),
                    data: "0x"
                })
            ).to.emit(eventManager, "Log");
        });
    });

});