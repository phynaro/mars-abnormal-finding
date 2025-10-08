# Mobile Navigation Feature

## Overview

This feature adds a modern mobile-like navigation experience with a bottom fixed panel, similar to popular mobile apps. The navigation automatically adapts between desktop and mobile layouts.

## Features

### 🎯 Core Features
- **Bottom Fixed Navigation**: Modern mobile-style navigation bar at the bottom of the screen
- **Responsive Design**: Automatically switches between desktop and mobile layouts
- **Active State Indicators**: Visual feedback for current page with animations
- **Permission-Based Access**: Respects user permission levels
- **Smooth Animations**: Fluid transitions and hover effects
- **Accessibility**: Full ARIA support and keyboard navigation

### 📱 Mobile-Specific Features
- **Floating Action Button (FAB)**: Quick actions on relevant pages
- **Touch-Friendly**: Optimized for touch interactions
- **Safe Area Support**: Respects device safe areas (notches, etc.)
- **Gesture Support**: Touch feedback and scale animations

## Components

### 1. BottomNavigation Component
**Location**: `src/components/layout/BottomNavigation.tsx`

Main navigation bar with 5 key sections:
- Home
- Dashboard  
- Tickets
- Reports
- Settings

**Features**:
- Icon + label design
- Active state with background highlight and indicator dot
- Smooth scale animations
- Permission-based visibility

### 2. MobileLayout Component
**Location**: `src/components/layout/MobileLayout.tsx`

Dedicated mobile layout wrapper that includes:
- Top navigation bar
- Bottom navigation
- Floating action button
- Proper content padding

### 3. useBottomNavigation Hook
**Location**: `src/hooks/useBottomNavigation.ts`

Custom hook for managing bottom navigation behavior:
- Responsive visibility control
- Path-based hiding/showing
- Mobile detection

## Usage

### Automatic Integration
The mobile navigation is automatically integrated into the main Layout component. No additional setup required.

### Manual Usage
```tsx
import BottomNavigation from '@/components/layout/BottomNavigation';
import { useBottomNavigation } from '@/hooks/useBottomNavigation';

function MyComponent() {
  const { isVisible } = useBottomNavigation({
    hideOnPaths: ['/login', '/register'],
    showOnMobileOnly: true,
  });

  return (
    <div>
      {/* Your content */}
      {isVisible && <BottomNavigation />}
    </div>
  );
}
```

## Configuration

### Navigation Items
Edit `src/components/layout/BottomNavigation.tsx` to modify navigation items:

```tsx
const bottomNavItems: BottomNavItem[] = [
  {
    id: 'home',
    label: 'Home',
    icon: <Home className="h-5 w-5" />,
    path: '/home',
    permissionLevel: 1,
  },
  // Add more items...
];
```

### Responsive Breakpoint
The mobile/desktop breakpoint is set to 1024px (lg breakpoint). To change:

1. Update `useBottomNavigation.ts`:
```tsx
const isMobileView = window.innerWidth < 1024; // Change this value
```

2. Update `Layout.tsx`:
```tsx
const isMobileView = window.innerWidth < 1024; // Change this value
```

### Hide on Specific Paths
Configure paths where bottom navigation should be hidden:

```tsx
const { isVisible } = useBottomNavigation({
  hideOnPaths: ['/login', '/register', '/verify-email'],
  showOnMobileOnly: true,
});
```

## Styling

### CSS Classes
The navigation uses Tailwind CSS classes with custom animations:

- `animate-in slide-in-from-bottom-2`: Entry animation
- `safe-area-inset-bottom`: Safe area support
- `backdrop-blur`: Glass morphism effect
- `active:scale-95`: Touch feedback

### Customization
To customize the appearance, modify the className props in `BottomNavigation.tsx`:

```tsx
className={cn(
  "fixed bottom-0 left-0 right-0 z-50",
  "bg-background/95 backdrop-blur", // Background
  "border-t border-border shadow-lg", // Border and shadow
  "lg:hidden", // Responsive visibility
  className // Custom classes
)}
```

## Testing

### Automated Testing
Run the test script in browser console:

```javascript
// Load the test script
const script = document.createElement('script');
script.src = '/test-mobile-nav.js';
document.head.appendChild(script);

// Run tests
window.testMobileNavigation.runAllTests();
```

### Manual Testing Checklist
- [ ] Bottom navigation appears on mobile viewport (< 1024px)
- [ ] Bottom navigation hidden on desktop viewport (≥ 1024px)
- [ ] Navigation items show correct active states
- [ ] Touch interactions work smoothly
- [ ] Floating action button appears on supported pages
- [ ] Navigation respects user permissions
- [ ] Smooth animations and transitions
- [ ] Accessibility features work (screen readers, keyboard)

## Browser Support

- ✅ Chrome/Chromium (mobile & desktop)
- ✅ Safari (iOS & macOS)
- ✅ Firefox (mobile & desktop)
- ✅ Edge (mobile & desktop)
- ✅ Samsung Internet
- ✅ Opera Mobile

## Performance

### Optimizations
- **Lazy Loading**: Components only render when needed
- **Efficient Re-renders**: Minimal state updates
- **CSS Animations**: Hardware-accelerated transitions
- **Responsive Detection**: Debounced resize listeners

### Bundle Impact
- **BottomNavigation**: ~3KB gzipped
- **MobileLayout**: ~2KB gzipped  
- **useBottomNavigation**: ~1KB gzipped
- **Total**: ~6KB gzipped

## Troubleshooting

### Common Issues

**Bottom navigation not showing on mobile**
- Check if viewport width is < 1024px
- Verify `hideOnPaths` configuration
- Check browser console for errors

**Navigation items not responding**
- Verify user has required permission level
- Check if path exists in routing configuration
- Ensure navigation handler is properly bound

**Styling issues**
- Check Tailwind CSS classes are available
- Verify custom CSS doesn't conflict
- Check z-index values for proper layering

### Debug Mode
Enable debug logging by adding to `useBottomNavigation.ts`:

```tsx
console.log('Bottom nav visibility:', {
  isMobile,
  shouldHideOnPath,
  isVisible
});
```

## Future Enhancements

### Planned Features
- [ ] Swipe gestures for navigation
- [ ] Haptic feedback on supported devices
- [ ] Customizable navigation items per user
- [ ] Badge notifications on navigation items
- [ ] Dark/light theme animations
- [ ] PWA install prompts integration

### Potential Improvements
- [ ] Navigation history with back/forward
- [ ] Quick search integration
- [ ] Contextual navigation based on user role
- [ ] Analytics integration for navigation usage

## Contributing

When contributing to the mobile navigation:

1. **Test on multiple devices**: iOS, Android, desktop
2. **Check accessibility**: Screen readers, keyboard navigation
3. **Verify performance**: No layout shifts, smooth animations
4. **Update documentation**: Keep this README current
5. **Add tests**: Include test cases for new features

## License

This feature is part of the MARS Abnormal Finding project and follows the same license terms.
