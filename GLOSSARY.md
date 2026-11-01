# Trackbit

Trackbit is an issue tracker. A project holds tickets, and each ticket has a reporter, an optional assignee, and a comment thread.

## Language

**Ticket**:
A piece of work tracked in a project.
_Avoid_: Issue, card, task

**Ticket key**:
The stable name of a ticket, formed from its project key and number, such as WEB-12.
_Avoid_: Ticket id, issue number

**Reporter**:
The user who created a ticket. A ticket's reporter does not change.
_Avoid_: Owner, creator

**Assignee**:
The project member a ticket is assigned to. A ticket may have no assignee.
_Avoid_: Owner

**Author**:
The user who wrote a comment.
_Avoid_: Commenter, owner

**Comment**:
A message in a ticket's thread.
_Avoid_: Note, reply

**Unknown**:
A person named on a ticket or comment who is not a member of that project.
_Avoid_: Former member, deleted user
