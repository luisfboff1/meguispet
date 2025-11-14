# Feedback System - Documentation

## Overview

The feedback system allows users to submit bug reports, feature requests, and improvement suggestions. The system uses a Kanban board to track the status of each feedback ticket through different stages: Backlog, In Progress, In Testing, and Completed.

## Features

### 1. User Features

#### Create Feedback Tickets
- **Type Selection**: Choose from Bug, Improvement, New Feature, or Other
- **Priority Level**: Set priority (Low, Medium, High, Critical)
- **Title & Description**: Provide clear title and detailed description
- **Image Paste Support**: Paste images directly (Ctrl+V) after taking screenshots
- **File Attachments**: Upload files like screenshots, documents, etc.

#### View Tickets
- See all feedback tickets organized in a Kanban board
- View ticket details including attachments and comments
- Track progress as administrators move tickets through stages

### 2. Administrator Features

#### Drag-and-Drop Management
- Move tickets between columns by dragging
- Update ticket status (Backlog → In Progress → In Testing → Completed)
- Full audit trail with timestamp and user tracking

#### Ticket Management
- View all tickets with full details
- Add comments to tickets
- Update ticket metadata

## Usage Guide

### Creating a Feedback Ticket

1. Navigate to **Feedback** from the sidebar menu
2. Click the **"Criar Feedback"** button in the top right
3. Fill in the form:
   - Select ticket type (Bug, Improvement, New Feature, Other)
   - Choose priority level (Low, Medium, High, Critical)
   - Enter a descriptive title
   - Write a detailed description
   - (Optional) Paste images by pressing Ctrl+V after copying a screenshot
   - (Optional) Attach files using the file upload button
4. Click **"Criar Feedback"** to submit
5. The ticket will automatically appear in the **Backlog** column

### Viewing the Kanban Board

The board has four columns:

1. **Backlog**: Newly created tickets waiting to be addressed
2. **Em Andamento** (In Progress): Tickets currently being worked on
3. **Em Teste** (In Testing): Tickets being tested before completion
4. **Concluído** (Completed): Fixed/implemented tickets

Each card shows:
- Ticket type icon and label
- Priority badge
- Title and description preview
- Creator name
- Number of attachments (if any)
- Number of comments (if any)
- Creation date

### For Administrators

Administrators can drag tickets between columns to update their status:

1. Click and hold a ticket card
2. Drag it to the desired column
3. Release to drop and update the status
4. The change is saved automatically

Regular users cannot move tickets - only administrators have this privilege.

## Database Schema

### Tables

#### `feedback_tickets`
Stores the main feedback ticket information:
- `id` (UUID): Primary key
- `titulo` (VARCHAR): Ticket title
- `descricao` (TEXT): Detailed description
- `tipo` (ENUM): Bug, Improvement, Feature, Other
- `prioridade` (ENUM): Low, Medium, High, Critical
- `status` (ENUM): Backlog, In Progress, In Testing, Completed, Canceled
- `usuario_id` (BIGINT): Creator user ID (FK to usuarios)
- `created_at`, `updated_at`: Timestamps
- `updated_by` (BIGINT): Last modifier user ID (FK to usuarios)

#### `feedback_anexos`
Stores file attachments:
- `id` (UUID): Primary key
- `ticket_id` (UUID): FK to feedback_tickets
- `nome_arquivo` (VARCHAR): File name
- `tipo_arquivo` (VARCHAR): MIME type
- `tamanho_bytes` (BIGINT): File size
- `conteudo_base64` (TEXT): Base64-encoded file content (for images)
- `url` (TEXT): Optional external URL
- `created_at`: Timestamp

#### `feedback_comentarios`
Stores comments on tickets:
- `id` (UUID): Primary key
- `ticket_id` (UUID): FK to feedback_tickets
- `usuario_id` (BIGINT): Commenter user ID (FK to usuarios)
- `comentario` (TEXT): Comment text
- `created_at`: Timestamp

## Technical Implementation

### Frontend Components

1. **FeedbackForm.tsx**: Modal form for creating new tickets
   - Image paste detection using clipboard API
   - File upload with drag-and-drop support
   - Real-time validation

2. **KanbanBoard.tsx**: Kanban board display
   - Drag-and-drop for admins
   - Responsive card layout
   - Real-time status updates

3. **feedback.tsx**: Main page component
   - Integrates form and board
   - Handles data fetching and state management
   - Role-based UI (admin vs. user)

### Backend Service

**feedbackService.ts**: Supabase-based service layer
- `getAll()`: Fetch all tickets with filters
- `getById()`: Get single ticket with full details
- `create()`: Create new ticket with attachments
- `update()`: Update ticket (admin only for status changes)
- `delete()`: Delete ticket
- `addComment()`: Add comment to ticket
- `getByStatus()`: Get tickets grouped by status for Kanban board

### Security

- **Row Level Security (RLS)**: Enabled on all tables
- **Read Access**: All authenticated users can view tickets
- **Create Access**: All authenticated users can create tickets and comments
- **Update Access**: Only admins can update ticket status
- **Audit Trail**: All changes tracked with user ID and timestamp

## Migration

To set up the database, run the migration file:
```sql
database/migrations/004_feedback_system.sql
```

This creates all necessary tables, indexes, triggers, and RLS policies.

## API Integration

The feedback system integrates seamlessly with the existing application:
- Uses the same authentication system (Supabase Auth)
- Follows the same TypeScript type system
- Uses the existing modal system
- Integrated into the main sidebar navigation

## Future Enhancements

Potential improvements for future versions:
1. Email notifications when ticket status changes
2. Rich text editor for descriptions
3. Image preview in ticket cards
4. Filtering and search capabilities
5. Export tickets to CSV/PDF
6. Comment threading
7. Ticket assignment to specific users
8. Due dates and SLA tracking
9. Vote/upvote system for feature requests
10. Integration with external issue trackers (GitHub, Jira)
