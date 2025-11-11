import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test-utils'
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarGroupAction,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarSeparator,
  SidebarTrigger,
  SidebarInput,
  SidebarInset,
  SidebarRail,
  useSidebar,
} from './sidebar'

// Mock the useIsMobile hook
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false, // Default to desktop mode
}))

describe('Sidebar', () => {
  beforeEach(() => {
    // Clear cookies before each test
    document.cookie = 'sidebar_state=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
  })

  describe('SidebarProvider', () => {
    it('renders sidebar provider', () => {
      const { container } = render(
        <SidebarProvider>
          <div>Content</div>
        </SidebarProvider>
      )

      expect(container.querySelector('[data-slot="sidebar-wrapper"]')).toBeInTheDocument()
      expect(screen.getByText('Content')).toBeInTheDocument()
    })

    it('provides sidebar context', () => {
      const TestComponent = () => {
        const { state } = useSidebar()
        return <div>State: {state}</div>
      }

      render(
        <SidebarProvider>
          <TestComponent />
        </SidebarProvider>
      )

      expect(screen.getByText(/State:/)).toBeInTheDocument()
    })

    it('starts expanded by default', () => {
      const TestComponent = () => {
        const { state } = useSidebar()
        return <div>State: {state}</div>
      }

      render(
        <SidebarProvider>
          <TestComponent />
        </SidebarProvider>
      )

      expect(screen.getByText('State: expanded')).toBeInTheDocument()
    })

    it('can start collapsed', () => {
      const TestComponent = () => {
        const { state } = useSidebar()
        return <div>State: {state}</div>
      }

      render(
        <SidebarProvider defaultOpen={false}>
          <TestComponent />
        </SidebarProvider>
      )

      expect(screen.getByText('State: collapsed')).toBeInTheDocument()
    })

    it('throws error when useSidebar used outside provider', () => {
      const TestComponent = () => {
        try {
          useSidebar()
          return <div>Should not render</div>
        } catch (error) {
          return <div>Error caught</div>
        }
      }

      render(<TestComponent />)

      expect(screen.getByText('Error caught')).toBeInTheDocument()
    })
  })

  describe('Sidebar', () => {
    it('renders sidebar', () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar>
            <div>Sidebar content</div>
          </Sidebar>
        </SidebarProvider>
      )

      expect(container.querySelector('[data-slot="sidebar"]')).toBeInTheDocument()
    })

    it('renders with left side by default', () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar>Content</Sidebar>
        </SidebarProvider>
      )

      const sidebar = container.querySelector('[data-side="left"]')
      expect(sidebar).toBeInTheDocument()
    })

    it('renders with right side', () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar side="right">Content</Sidebar>
        </SidebarProvider>
      )

      const sidebar = container.querySelector('[data-side="right"]')
      expect(sidebar).toBeInTheDocument()
    })

    it('supports sidebar variant', () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar variant="sidebar">Content</Sidebar>
        </SidebarProvider>
      )

      const sidebar = container.querySelector('[data-variant="sidebar"]')
      expect(sidebar).toBeInTheDocument()
    })

    it('supports floating variant', () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar variant="floating">Content</Sidebar>
        </SidebarProvider>
      )

      const sidebar = container.querySelector('[data-variant="floating"]')
      expect(sidebar).toBeInTheDocument()
    })

    it('supports inset variant', () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar variant="inset">Content</Sidebar>
        </SidebarProvider>
      )

      const sidebar = container.querySelector('[data-variant="inset"]')
      expect(sidebar).toBeInTheDocument()
    })

    it('supports offcanvas collapsible mode', () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar collapsible="offcanvas">Content</Sidebar>
        </SidebarProvider>
      )

      expect(container.querySelector('[data-slot="sidebar"]')).toBeInTheDocument()
    })

    it('supports icon collapsible mode', () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar collapsible="icon">Content</Sidebar>
        </SidebarProvider>
      )

      expect(container.querySelector('[data-slot="sidebar"]')).toBeInTheDocument()
    })

    it('supports none collapsible mode', () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar collapsible="none">Content</Sidebar>
        </SidebarProvider>
      )

      expect(container.querySelector('[data-slot="sidebar"]')).toBeInTheDocument()
    })
  })

  describe('Sidebar Structure', () => {
    it('renders sidebar header', () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar>
            <SidebarHeader>
              <h2>Header</h2>
            </SidebarHeader>
          </Sidebar>
        </SidebarProvider>
      )

      expect(container.querySelector('[data-slot="sidebar-header"]')).toBeInTheDocument()
      expect(screen.getByText('Header')).toBeInTheDocument()
    })

    it('renders sidebar content', () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>
              <p>Content area</p>
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      )

      expect(container.querySelector('[data-slot="sidebar-content"]')).toBeInTheDocument()
      expect(screen.getByText('Content area')).toBeInTheDocument()
    })

    it('renders sidebar footer', () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar>
            <SidebarFooter>
              <p>Footer content</p>
            </SidebarFooter>
          </Sidebar>
        </SidebarProvider>
      )

      expect(container.querySelector('[data-slot="sidebar-footer"]')).toBeInTheDocument()
      expect(screen.getByText('Footer content')).toBeInTheDocument()
    })

    it('renders complete sidebar structure', () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar>
            <SidebarHeader>Header</SidebarHeader>
            <SidebarContent>Content</SidebarContent>
            <SidebarFooter>Footer</SidebarFooter>
          </Sidebar>
        </SidebarProvider>
      )

      expect(container.querySelector('[data-slot="sidebar-header"]')).toBeInTheDocument()
      expect(container.querySelector('[data-slot="sidebar-content"]')).toBeInTheDocument()
      expect(container.querySelector('[data-slot="sidebar-footer"]')).toBeInTheDocument()
    })
  })

  describe('Sidebar Components', () => {
    it('renders sidebar input', () => {
      render(
        <SidebarProvider>
          <Sidebar>
            <SidebarInput placeholder="Search..." />
          </Sidebar>
        </SidebarProvider>
      )

      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
    })

    it('renders sidebar separator', () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>
              <div>Section 1</div>
              <SidebarSeparator />
              <div>Section 2</div>
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      )

      expect(container.querySelector('[data-slot="sidebar-separator"]')).toBeInTheDocument()
    })

    it('renders sidebar rail', () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar>
            <SidebarRail />
          </Sidebar>
        </SidebarProvider>
      )

      expect(container.querySelector('[data-slot="sidebar-rail"]')).toBeInTheDocument()
    })

    it('renders sidebar trigger', () => {
      render(
        <SidebarProvider>
          <Sidebar>
            <SidebarTrigger />
          </Sidebar>
        </SidebarProvider>
      )

      expect(screen.getByRole('button', { name: /toggle sidebar/i })).toBeInTheDocument()
    })

    it('renders sidebar inset', () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar>Content</Sidebar>
          <SidebarInset>
            <main>Main content</main>
          </SidebarInset>
        </SidebarProvider>
      )

      expect(container.querySelector('[data-slot="sidebar-inset"]')).toBeInTheDocument()
      expect(screen.getByText('Main content')).toBeInTheDocument()
    })
  })

  describe('Sidebar Groups', () => {
    it('renders sidebar group', () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>
              <SidebarGroup>
                <p>Group content</p>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      )

      expect(container.querySelector('[data-slot="sidebar-group"]')).toBeInTheDocument()
      expect(screen.getByText('Group content')).toBeInTheDocument()
    })

    it('renders sidebar group label', () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Group Title</SidebarGroupLabel>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      )

      expect(container.querySelector('[data-slot="sidebar-group-label"]')).toBeInTheDocument()
      expect(screen.getByText('Group Title')).toBeInTheDocument()
    })

    it('renders sidebar group content', () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <p>Content here</p>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      )

      expect(container.querySelector('[data-slot="sidebar-group-content"]')).toBeInTheDocument()
      expect(screen.getByText('Content here')).toBeInTheDocument()
    })

    it('renders sidebar group action', () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupAction>
                  <button>+</button>
                </SidebarGroupAction>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      )

      expect(container.querySelector('[data-slot="sidebar-group-action"]')).toBeInTheDocument()
    })
  })

  describe('Sidebar Menu', () => {
    it('renders sidebar menu', () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>Item</SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      )

      expect(container.querySelector('[data-slot="sidebar-menu"]')).toBeInTheDocument()
    })

    it('renders menu items', () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton>Home</SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      )

      expect(container.querySelector('[data-slot="sidebar-menu-item"]')).toBeInTheDocument()
      expect(screen.getByText('Home')).toBeInTheDocument()
    })

    it('renders menu button', () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton>Dashboard</SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      )

      expect(container.querySelector('[data-slot="sidebar-menu-button"]')).toBeInTheDocument()
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    it('renders active menu button', () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={true}>Active Item</SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      )

      const button = container.querySelector('[data-active="true"]')
      expect(button).toBeInTheDocument()
    })

    it('renders menu button with tooltip', () => {
      render(
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Home page">Home</SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      )

      expect(screen.getByText('Home')).toBeInTheDocument()
    })

    it('renders menu action', () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton>Item</SidebarMenuButton>
                  <SidebarMenuAction>
                    <button>⋮</button>
                  </SidebarMenuAction>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      )

      expect(container.querySelector('[data-slot="sidebar-menu-action"]')).toBeInTheDocument()
    })

    it('renders menu badge', () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton>Messages</SidebarMenuButton>
                  <SidebarMenuBadge>5</SidebarMenuBadge>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      )

      expect(container.querySelector('[data-slot="sidebar-menu-badge"]')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
    })

    it('renders menu skeleton', () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuSkeleton />
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      )

      expect(container.querySelector('[data-slot="sidebar-menu-skeleton"]')).toBeInTheDocument()
    })

    it('renders menu skeleton with icon', () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuSkeleton showIcon />
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      )

      const iconSkeleton = container.querySelector('[data-sidebar="menu-skeleton-icon"]')
      expect(iconSkeleton).toBeInTheDocument()
    })
  })

  describe('Sidebar Submenu', () => {
    it('renders submenu', () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton>Parent</SidebarMenuButton>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton>Child</SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      )

      expect(container.querySelector('[data-slot="sidebar-menu-sub"]')).toBeInTheDocument()
      expect(screen.getByText('Child')).toBeInTheDocument()
    })

    it('renders submenu items', () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton>Subitem 1</SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton>Subitem 2</SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      )

      expect(screen.getByText('Subitem 1')).toBeInTheDocument()
      expect(screen.getByText('Subitem 2')).toBeInTheDocument()
    })

    it('renders active submenu button', () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton isActive={true}>
                        Active Sub
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      )

      const button = container.querySelector('[data-active="true"]')
      expect(button).toBeInTheDocument()
    })
  })

  describe('Use Cases', () => {
    it('works as application sidebar', () => {
      render(
        <SidebarProvider>
          <Sidebar>
            <SidebarHeader>
              <h2>My App</h2>
            </SidebarHeader>
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton>Dashboard</SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton>Projects</SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton>Settings</SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter>
              <p>© 2024</p>
            </SidebarFooter>
          </Sidebar>
          <SidebarInset>
            <main>Main content</main>
          </SidebarInset>
        </SidebarProvider>
      )

      expect(screen.getByText('My App')).toBeInTheDocument()
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Projects')).toBeInTheDocument()
      expect(screen.getByText('Settings')).toBeInTheDocument()
      expect(screen.getByText('Main content')).toBeInTheDocument()
    })

    it('works with grouped navigation', () => {
      render(
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>General</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton>Home</SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
              <SidebarSeparator />
              <SidebarGroup>
                <SidebarGroupLabel>Admin</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton>Users</SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      )

      expect(screen.getByText('General')).toBeInTheDocument()
      expect(screen.getByText('Home')).toBeInTheDocument()
      expect(screen.getByText('Admin')).toBeInTheDocument()
      expect(screen.getByText('Users')).toBeInTheDocument()
    })
  })

  describe('Custom Props', () => {
    it('accepts custom className on sidebar', () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar className="custom-sidebar">Content</Sidebar>
        </SidebarProvider>
      )

      // Check for custom class in the sidebar container
      const sidebarContainer = container.querySelector('.custom-sidebar')
      expect(sidebarContainer).toBeInTheDocument()
    })

    it('accepts custom className on menu button', () => {
      const { container } = render(
        <SidebarProvider>
          <Sidebar>
            <SidebarContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton className="custom-button">Item</SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarContent>
          </Sidebar>
        </SidebarProvider>
      )

      const button = container.querySelector('.custom-button')
      expect(button).toBeInTheDocument()
    })
  })
})
