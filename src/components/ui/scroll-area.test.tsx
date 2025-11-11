import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test-utils'
import { ScrollArea, ScrollBar } from './scroll-area'

describe('ScrollArea', () => {
  describe('Rendering', () => {
    it('renders scroll area', () => {
      const { container } = render(
        <ScrollArea>
          <div>Content</div>
        </ScrollArea>
      )
      expect(screen.getByText('Content')).toBeInTheDocument()
      expect(container.firstChild).toBeInTheDocument()
    })

    it('renders children content', () => {
      render(
        <ScrollArea>
          <p>Paragraph 1</p>
          <p>Paragraph 2</p>
          <p>Paragraph 3</p>
        </ScrollArea>
      )

      expect(screen.getByText('Paragraph 1')).toBeInTheDocument()
      expect(screen.getByText('Paragraph 2')).toBeInTheDocument()
      expect(screen.getByText('Paragraph 3')).toBeInTheDocument()
    })

    it('renders with test id', () => {
      render(
        <ScrollArea data-testid="test-scroll">
          <div>Content</div>
        </ScrollArea>
      )
      expect(screen.getByTestId('test-scroll')).toBeInTheDocument()
    })
  })

  describe('Content Types', () => {
    it('renders text content', () => {
      render(
        <ScrollArea>
          <div>Text content that may overflow</div>
        </ScrollArea>
      )
      expect(screen.getByText('Text content that may overflow')).toBeInTheDocument()
    })

    it('renders list content', () => {
      render(
        <ScrollArea>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
            <li>Item 3</li>
          </ul>
        </ScrollArea>
      )

      expect(screen.getByText('Item 1')).toBeInTheDocument()
      expect(screen.getByText('Item 2')).toBeInTheDocument()
      expect(screen.getByText('Item 3')).toBeInTheDocument()
    })

    it('renders complex nested content', () => {
      render(
        <ScrollArea>
          <div>
            <h3>Title</h3>
            <p>Description</p>
            <button>Action</button>
          </div>
        </ScrollArea>
      )

      expect(screen.getByText('Title')).toBeInTheDocument()
      expect(screen.getByText('Description')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
    })

    it('renders long content list', () => {
      const items = Array.from({ length: 100 }, (_, i) => `Item ${i + 1}`)

      render(
        <ScrollArea>
          <div>
            {items.map((item) => (
              <div key={item}>{item}</div>
            ))}
          </div>
        </ScrollArea>
      )

      expect(screen.getByText('Item 1')).toBeInTheDocument()
      expect(screen.getByText('Item 100')).toBeInTheDocument()
    })
  })

  describe('ScrollBar', () => {
    it('renders with vertical scrollbar by default', () => {
      const { container } = render(
        <ScrollArea>
          <div style={{ height: '1000px' }}>Tall content</div>
        </ScrollArea>
      )

      expect(screen.getByText('Tall content')).toBeInTheDocument()
      // ScrollArea renders internal scrollbar components
      expect(container.querySelector('[data-radix-scroll-area-viewport]')).toBeInTheDocument()
    })

    it('supports horizontal scrollbar', () => {
      render(
        <ScrollArea>
          <ScrollBar orientation="horizontal" />
          <div>Content</div>
        </ScrollArea>
      )

      // Verify ScrollArea structure exists
      expect(screen.getByText('Content')).toBeInTheDocument()
    })

    it('supports vertical scrollbar explicitly', () => {
      render(
        <ScrollArea>
          <ScrollBar orientation="vertical" />
          <div>Content</div>
        </ScrollArea>
      )

      // Verify ScrollArea structure exists
      expect(screen.getByText('Content')).toBeInTheDocument()
    })
  })

  describe('Custom Props', () => {
    it('accepts custom className', () => {
      render(
        <ScrollArea className="custom-scroll" data-testid="scroll">
          <div>Content</div>
        </ScrollArea>
      )

      expect(screen.getByTestId('scroll')).toHaveClass('custom-scroll')
    })

    it('applies custom styles', () => {
      const { container } = render(
        <ScrollArea style={{ height: '300px' }}>
          <div>Content</div>
        </ScrollArea>
      )

      const scrollArea = container.firstChild as HTMLElement
      expect(scrollArea.style.height).toBe('300px')
    })

    it('accepts data attributes', () => {
      render(
        <ScrollArea data-custom="test" data-testid="scroll">
          <div>Content</div>
        </ScrollArea>
      )

      expect(screen.getByTestId('scroll')).toHaveAttribute('data-custom', 'test')
    })
  })

  describe('Use Cases', () => {
    it('works as sidebar navigation container', () => {
      render(
        <ScrollArea className="h-screen">
          <nav>
            <a href="/home">Home</a>
            <a href="/about">About</a>
            <a href="/services">Services</a>
            <a href="/contact">Contact</a>
          </nav>
        </ScrollArea>
      )

      expect(screen.getByText('Home')).toBeInTheDocument()
      expect(screen.getByText('About')).toBeInTheDocument()
      expect(screen.getByText('Services')).toBeInTheDocument()
      expect(screen.getByText('Contact')).toBeInTheDocument()
    })

    it('works as content container with overflow', () => {
      const longText = 'Lorem ipsum '.repeat(100)

      const { container } = render(
        <ScrollArea className="h-[200px]">
          <p>{longText}</p>
        </ScrollArea>
      )

      // Check that content is rendered within scroll area
      const paragraph = container.querySelector('p')
      expect(paragraph).toBeInTheDocument()
      expect(paragraph?.textContent).toContain('Lorem ipsum')
    })

    it('works as message list container', () => {
      const messages = [
        { id: 1, text: 'Message 1', sender: 'Alice' },
        { id: 2, text: 'Message 2', sender: 'Bob' },
        { id: 3, text: 'Message 3', sender: 'Charlie' },
      ]

      render(
        <ScrollArea>
          <div>
            {messages.map((msg) => (
              <div key={msg.id}>
                <strong>{msg.sender}:</strong> {msg.text}
              </div>
            ))}
          </div>
        </ScrollArea>
      )

      expect(screen.getByText('Alice:')).toBeInTheDocument()
      expect(screen.getByText('Message 1')).toBeInTheDocument()
      expect(screen.getByText('Bob:')).toBeInTheDocument()
      expect(screen.getByText('Message 2')).toBeInTheDocument()
    })

    it('works as code block container', () => {
      const code = `function example() {
  console.log('Hello World');
  return true;
}`

      render(
        <ScrollArea>
          <pre>
            <code>{code}</code>
          </pre>
        </ScrollArea>
      )

      expect(screen.getByText(/function example/)).toBeInTheDocument()
    })

    it('works as data table wrapper', () => {
      render(
        <ScrollArea>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>John</td>
                <td>john@example.com</td>
              </tr>
            </tbody>
          </table>
        </ScrollArea>
      )

      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(screen.getByText('Name')).toBeInTheDocument()
      expect(screen.getByText('John')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('maintains content accessibility', () => {
      render(
        <ScrollArea>
          <button>Clickable button</button>
        </ScrollArea>
      )

      const button = screen.getByRole('button', { name: 'Clickable button' })
      expect(button).toBeInTheDocument()
    })

    it('preserves semantic HTML structure', () => {
      render(
        <ScrollArea>
          <article>
            <h1>Article Title</h1>
            <p>Article content</p>
          </article>
        </ScrollArea>
      )

      expect(screen.getByRole('article')).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })

    it('supports keyboard navigation for focusable elements', () => {
      render(
        <ScrollArea>
          <button>Button 1</button>
          <button>Button 2</button>
        </ScrollArea>
      )

      const button1 = screen.getByRole('button', { name: 'Button 1' })
      const button2 = screen.getByRole('button', { name: 'Button 2' })

      button1.focus()
      expect(button1).toHaveFocus()

      button2.focus()
      expect(button2).toHaveFocus()
    })
  })
})
