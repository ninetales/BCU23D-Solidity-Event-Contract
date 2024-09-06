// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract EventManager is ReentrancyGuard {
    address private owner;
    uint16 private eventsCounter;
    uint256 private refundTimespan;
    string[] private eventsIdList;

    constructor() {
        owner = msg.sender;
        eventsCounter = 0;
        refundTimespan = 86400;
    }

    // ==========================================================================================
    // Errors
    // ==========================================================================================
    error NoTicketFound(address owner, string eventId);
    error NoEventFound(string eventId);

    // ==========================================================================================
    // Enums
    // ==========================================================================================
    enum EventStatus { Active, Paused }

    // ==========================================================================================
    // Structs
    // ==========================================================================================
    struct Ticket {
        address owner;
        string fname;
        string lname;
        string email;
        uint256 paidPrice;
        uint256 purchased;
    }

    struct Event {
        string eventId;
        address creator;
        string name;
        uint16 ticketLimit;
        uint256 eventDate;
        uint256 price; // Stored in wei
        EventStatus status;
        Ticket[] tickets;
    }

    // ==========================================================================================
    // Modifiers
    // ==========================================================================================
    modifier admin() {
        require(msg.sender == owner, "Access denied! You must be the owner of this contract.");
        _;
    }

    // ==========================================================================================
    // Maps
    // ==========================================================================================
    mapping(string => Event) internal events;

    // ==========================================================================================
    // Events
    // ==========================================================================================
    event NewEventCreated(string eventId, string eventName, address eventCreator, uint256 eventDate, EventStatus status);
    event EventStatusUpdated(string eventId, string eventName, address eventCreator, EventStatus status);
    event NewTicketCreated(address accountAddress, string eventId, uint256 ticketPrice);
    event TicketCanceled(address accountAddress, string eventId, uint256 refundedAmount);
    event Log(address sender, bytes data);

    // ==========================================================================================
    // Functions
    // ==========================================================================================
    function createEvent(string memory _name, uint16 _ticketLimit, uint256 _priceInEther, uint256 _eventDate) external admin {

        require(block.timestamp < _eventDate, "Cannot set a timestamp in the past. Try again with a UNIX Timestamp in the future.");

        eventsCounter++;
        string memory _eventId = string(abi.encodePacked("ev", Strings.toString(eventsCounter)));
        uint256 _priceInWei = _priceInEther * 1 ether;

        Event storage newEvent = events[_eventId];
        newEvent.eventId = _eventId;
        newEvent.creator = msg.sender;
        newEvent.name = _name;
        newEvent.ticketLimit = _ticketLimit;
        newEvent.price = _priceInWei;
        newEvent.eventDate = _eventDate;
        newEvent.status = EventStatus.Active;

        eventsIdList.push(_eventId);

        emit NewEventCreated(_eventId, _name, msg.sender, _eventDate, EventStatus.Active);

    }

    // **********************************************
    // List event IDs
    // **********************************************
    function listEvents() public view returns(string[] memory) {
        return eventsIdList;
    }

    // **********************************************
    // Display event details
    // **********************************************
    function showEventDetails(string memory _eventId) public view returns (
        string memory eventId,
        address creator,
        string memory name,
        uint16 ticketLimit,
        uint256 price,
        uint256 eventDate,
        EventStatus status
    ) {
        Event storage eventData = events[_eventId];
        if(eventData.creator == address(0)){
            revert NoEventFound(_eventId);
        }
        return (
            eventData.eventId,
            eventData.creator,
            eventData.name,
            eventData.ticketLimit,
            eventData.price,
            eventData.eventDate,
            eventData.status
        );
    }

    // **********************************************
    // List participants for an event
    // **********************************************
    function listEventParticipants(string memory _eventId) public view admin returns (Ticket[] memory) {
        require(bytes(_eventId).length > 0, "Event ID cannot be empty");
        Event storage eventData = events[_eventId];
        return eventData.tickets;
    }

    // **********************************************
    // Toggle event pause
    // **********************************************
    function togglePauseEventRegistration(string memory _eventId, EventStatus _status) public admin {
        Event storage eventData = events[_eventId];
        require(eventData.creator != address(0), "No event with that ID was found");
        require(eventData.status != _status, "That status is already set");
        eventData.status = _status;
        emit EventStatusUpdated(_eventId, eventData.name, eventData.creator, _status);
    }

    // **********************************************
    // Buy a ticket for an event
    // **********************************************
    function buyTicket(string memory _eventId, string memory _fname, string memory _lname, string memory _email) external payable nonReentrant {

        Event storage eventData = events[_eventId];
        (bool ticketExist, ,) = getUserTicket(_eventId);

        require(eventData.creator != address(0), "No event with that ID was found!");
        require(msg.sender != eventData.creator, "You cannot buy a ticket for your own event");
        require(!ticketExist, "You have already purchased a ticket. You cannot buy another one..");
        require(eventData.eventDate > block.timestamp, "Too late to buy a ticket! Better luck next time.");
        require(eventData.status != EventStatus.Paused, "The ticket sales has been paused. Please try again later.");
        require(eventData.tickets.length < eventData.ticketLimit, "Tickets are sold out");
        require(msg.value >= eventData.price, "Not enough funds to buy a ticket! Refill account and please try again.");

        Ticket memory newTicket = Ticket({
            owner: msg.sender,
            fname: _fname,
            lname: _lname,
            email: _email,
            paidPrice: eventData.price,
            purchased: block.timestamp
        });

        eventData.tickets.push(newTicket);
        emit NewTicketCreated(msg.sender, eventData.eventId, eventData.price);
        

        // Refund excess funds
        if(msg.value > eventData.price){
            payable(msg.sender).transfer(msg.value - eventData.price);
        }

    }

    // **********************************************
    // Get the user ticket
    // **********************************************
    function getUserTicket(string memory _eventId) public view returns (bool, Ticket memory, uint16){

        Event storage eventData = events[_eventId];
        
        if(eventData.creator == address(0)){
            return (false, Ticket(address(0), "", "", "", 0, 0), 0); 
        }

        for(uint16 i = 0; i < eventData.tickets.length; i++){
            if(eventData.tickets[i].owner == msg.sender){
                return (
                    true,
                    eventData.tickets[i],
                    i
                );
            }
        } 

        return (false, Ticket(address(0), "", "", "", 0, 0), 0); 

    }

    // **********************************************
    // Cancel user ticket for an event
    // **********************************************
    function cancelTicket(string memory _eventId) public nonReentrant {
        
        (bool ticketExist, Ticket memory _userTicket, uint16 _currentTicketIndex) = getUserTicket(_eventId);
        if(!ticketExist){
            revert NoTicketFound(msg.sender, _eventId);
        }

        Event storage eventData = events[_eventId];
        Ticket[] storage tickets = eventData.tickets;
        uint256 refundDeadline = eventData.eventDate - refundTimespan;
        require(block.timestamp <= refundDeadline, "Sorry, the last date for a refund have passed :(");

        uint256 originalArrayLength = tickets.length;
        tickets[_currentTicketIndex] = tickets[tickets.length -1];
        tickets.pop();
        
        // Assert that the array length has decreased by exactly one
        assert(originalArrayLength == tickets.length + 1);

        payable(msg.sender).transfer(_userTicket.paidPrice);
        emit TicketCanceled(msg.sender, _eventId, _userTicket.paidPrice);
    }

    // **********************************************
    // Get the contract balance
    // **********************************************
    function getContractBalance() public view admin returns(uint){
        return address(this).balance;
    }

    // **********************************************
    // Fallback
    // **********************************************
    fallback() external { 
        emit Log(msg.sender, msg.data);
    }
}