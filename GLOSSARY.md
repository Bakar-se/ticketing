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

**Team**:
The people who can open one project: its members and its pending invites. A team belongs to a single project.
_Avoid_: Organization, workspace

**Member**:
A person who can open a project and work on its tickets. Anyone who creates a project is its first member.
_Avoid_: Collaborator, user, participant

**Owner**:
A member who manages a project's team and its settings. This is a project role, not a ticket role: a ticket's reporter and assignee are never called owners. An Owner can change the project's name, description, and target date, and can archive or delete the project.
_Avoid_: Admin, creator

**Pending invite**:
An invitation to an email address that has not yet become a member. It is not an assignee choice and does not grant access. It lasts 7 days from when it was last sent. After that it is expired: it stays on the team until an Owner resends or cancels it, and signing in does not accept it.
_Avoid_: Pending member, invitee
