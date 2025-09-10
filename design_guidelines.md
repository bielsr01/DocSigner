# Design Guidelines: Document Management & Digital Signature System

## Design Approach
**System-Based Approach**: Following Material Design principles for this utility-focused application that prioritizes functionality, data management, and workflow efficiency over visual marketing appeal.

## Core Design Elements

### Color Palette
**Primary Colors:**
- Light Mode: 220 85% 25% (Deep blue for primary actions)
- Dark Mode: 220 85% 65% (Lighter blue for dark theme)

**Neutral Colors:**
- Background Light: 0 0% 98%
- Background Dark: 220 15% 12%
- Surface Light: 0 0% 100%
- Surface Dark: 220 12% 18%
- Text Primary: 220 15% 25% (light) / 220 15% 85% (dark)

### Typography
- **Primary Font**: Inter (Google Fonts)
- **Secondary Font**: JetBrains Mono (for file names, variables)
- **Sizes**: text-sm, text-base, text-lg, text-xl, text-2xl for hierarchy

### Layout System
**Spacing Primitives**: Use Tailwind units of 2, 4, 6, and 8 consistently
- `p-4` for standard padding
- `m-6` for section margins  
- `gap-4` for component spacing
- `h-8` for standard button heights

### Component Library

**Navigation:**
- Fixed sidebar navigation (w-64) with company logo at top
- User profile section at bottom with admin access button
- Menu items: Modelos, Gerar Documentos, Certificados, Histórico, Download
- Active state indicators with primary color background

**Forms & Inputs:**
- Consistent form styling with floating labels
- File upload zones with drag-and-drop styling
- Multi-input options: manual entry, Excel/CSV upload, paste data
- Variable detection display with {{variable}} highlighting

**Data Display:**
- Document template cards with preview thumbnails
- Variable extraction tables with editable fields
- Progress indicators for batch processing
- Status badges for document states (processing, signed, ready)

**Download Interface:**
- Individual file download buttons
- Bulk ZIP download for batch operations
- File format indicators and size information

**Overlays:**
- Modal dialogs for certificate management
- Confirmation dialogs for critical actions
- Progress overlays for document processing

### Specific UI Considerations

**Document Processing:**
- Clear visual feedback for variable detection
- Template preview with highlighted variable zones
- Batch processing progress with individual file status

**Certificate Management:**
- Secure certificate upload interface
- Visual indicators for certificate validity
- Clear warnings for security-related actions

**Administrative Features:**
- User management table with role indicators
- System configuration panels
- Audit trail displays with timestamps

### Animations
Minimal motion design:
- Subtle loading spinners for processing
- Smooth sidebar transitions
- Progress bar animations for uploads

This design prioritizes clarity, security awareness, and workflow efficiency while maintaining professional aesthetics suitable for document management workflows.