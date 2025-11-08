# Feedback System - Visual Guide

## Authentication Protection

The feedback page is protected by authentication middleware. Users must log in to access the feedback system:

![Login Protection](https://github.com/user-attachments/assets/58cb2269-7799-4a14-b260-0d88c48c26b3)

When attempting to access `/feedback` without authentication, users are automatically redirected to the login page.

## UI Components Overview

### 1. Feedback Page Layout

The feedback page consists of:
- **Header Section**: Title, description, and action buttons (Refresh, Create Feedback)
- **Info Banners**: Different banners for regular users and administrators
- **Kanban Board**: Four columns showing ticket progression

### 2. Kanban Board Columns

#### Backlog
- **Color**: Gray/Slate
- **Icon**: Clock
- **Purpose**: Newly created tickets waiting to be addressed
- Tickets automatically appear here when created

#### Em Andamento (In Progress)
- **Color**: Blue
- **Icon**: Alert Circle
- **Purpose**: Tickets currently being worked on by developers
- Moved here when work begins

#### Em Teste (In Testing)
- **Color**: Orange
- **Icon**: Alert Circle
- **Purpose**: Tickets being tested/validated
- Moved here when implementation is complete and testing starts

#### Concluído (Completed)
- **Color**: Green
- **Icon**: Check Circle
- **Purpose**: Finished tickets (bugs fixed, features implemented)
- Final destination for successfully completed tickets

### 3. Ticket Card Design

Each ticket card displays:

```
┌─────────────────────────────────────┐
│ [Bug Icon] Bug         [Priority]   │
├─────────────────────────────────────┤
│ Ticket Title Here                   │
│                                     │
│ Description preview text goes       │
│ here and is limited to 2 lines...  │
├─────────────────────────────────────┤
│ 👤 User Name    📎 2  💬 3          │
│ 15 Jan 2025                         │
└─────────────────────────────────────┘
```

Components:
- **Header**: Type icon + label, Priority badge
- **Body**: Title (bold, 2 lines max), Description preview (2 lines max)
- **Footer**: User avatar/name, attachment count, comment count, date

### 4. Feedback Form Modal

The form includes:

#### Section 1: Metadata
- **Type Selection** (Dropdown):
  - 🐛 Correção de Bug
  - 💡 Sugestão de Melhoria
  - ✨ Nova Funcionalidade
  - ❓ Outro

- **Priority Selection** (Dropdown):
  - Baixa (Gray)
  - Média (Blue)
  - Alta (Orange)
  - Crítica (Red)

#### Section 2: Content
- **Title** (Text input): Single line, required
- **Description** (Textarea): Multi-line, required
  - Supports image paste (Ctrl+V)
  - Shows tip about paste functionality

#### Section 3: Attachments
- **Pasted Images** (Grid display):
  - Shows thumbnails of pasted images
  - Delete button on hover
  - Auto-generated names (imagem-colada-1.png)

- **File Upload** (List display):
  - Click to select files
  - Shows file name and size
  - Delete button for each file
  - Supports: images, PDF, DOC, DOCX, TXT

#### Section 4: Actions
- **Cancel** button (outline)
- **Create Feedback** button (primary)

### 5. User Permission Banners

#### Regular User Banner (Blue)
```
ℹ️ Você pode criar novos feedbacks, mas apenas 
   administradores podem mover os tickets entre as 
   colunas do quadro.
```

#### Administrator Banner (Amber)
```
🎯 Como administrador, você pode arrastar os tickets 
   entre as colunas para atualizar o status.
```

## Interaction Patterns

### Creating a Ticket (All Users)

1. Click "Criar Feedback" button
2. Modal opens with feedback form
3. Fill in all required fields
4. Optionally:
   - Paste images with Ctrl+V
   - Upload files
5. Click "Criar Feedback"
6. Success toast appears
7. Modal closes
8. Ticket appears in Backlog column

### Moving Tickets (Admins Only)

1. Click and hold a ticket card
2. Drag to desired column
3. Drop to update status
4. Card animates to new position
5. Success toast confirms update
6. Database updated with new status

### Viewing Ticket Details (All Users)

1. Click on any ticket card
2. Modal opens showing:
   - Full title and description
   - All attachments (with previews)
   - All comments
   - Metadata (creator, dates, etc.)
3. Click X or outside modal to close

## Color Scheme

### Ticket Types
- **Bug**: Red (#DC2626)
- **Melhoria**: Amber (#D97706)
- **Funcionalidade**: Blue (#2563EB)
- **Outro**: Slate (#475569)

### Priority Levels
- **Baixa**: Slate (#64748B)
- **Média**: Blue (#2563EB)
- **Alta**: Orange (#EA580C)
- **Crítica**: Red (#DC2626)

### Status Columns
- **Backlog**: Slate (#64748B)
- **Em Andamento**: Blue (#2563EB)
- **Em Teste**: Orange (#EA580C)
- **Concluído**: Green (#16A34A)

## Responsive Behavior

### Desktop (>1024px)
- All 4 columns visible side-by-side
- Sidebar expanded
- Modal centered, max-width 640px

### Tablet (768px - 1024px)
- Horizontal scroll for columns
- Sidebar collapsible
- Modal full-width with padding

### Mobile (<768px)
- Horizontal scroll for columns
- Minimum column width: 320px
- Sidebar overlay
- Modal full-screen

## Accessibility Features

1. **Keyboard Navigation**
   - Tab through all interactive elements
   - Escape to close modals
   - Enter to submit forms

2. **Screen Reader Support**
   - ARIA labels on all icons
   - Descriptive button text
   - Proper heading hierarchy

3. **Focus Management**
   - Focus trap in modals
   - Visible focus indicators
   - Return focus on modal close

4. **Color Contrast**
   - WCAG AA compliant
   - Color-blind friendly palette
   - Text readable on all backgrounds

## Performance Considerations

1. **Image Optimization**
   - Base64 encoding for pasted images
   - Lazy loading for attachments
   - Thumbnail generation

2. **Data Loading**
   - Initial load: All tickets
   - Subsequent: Only changes
   - Optimistic UI updates

3. **Animation**
   - Respects `prefers-reduced-motion`
   - Smooth 60fps animations
   - Hardware-accelerated transforms
