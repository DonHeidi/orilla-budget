import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test-utils'
import { Input } from './input'

describe('Input', () => {
  describe('Rendering', () => {
    it('renders input element', () => {
      render(<Input />)
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('renders with placeholder', () => {
      render(<Input placeholder="Enter text..." />)
      expect(screen.getByPlaceholderText('Enter text...')).toBeInTheDocument()
    })

    it('renders with default value', () => {
      render(<Input defaultValue="default text" />)
      expect(screen.getByRole('textbox')).toHaveValue('default text')
    })

    it('renders with value', () => {
      render(<Input value="controlled value" readOnly />)
      expect(screen.getByRole('textbox')).toHaveValue('controlled value')
    })
  })

  describe('Input Types', () => {
    it('renders text input by default', () => {
      render(<Input />)
      const input = screen.getByRole('textbox')
      // Default type may be implicit
      const inputType = input.getAttribute('type')
      expect(inputType === 'text' || inputType === null).toBe(true)
    })

    it('renders email input', () => {
      render(<Input type="email" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('type', 'email')
    })

    it('renders password input', () => {
      render(<Input type="password" />)
      const input = document.querySelector('input[type="password"]')
      expect(input).toBeInTheDocument()
    })

    it('renders number input', () => {
      render(<Input type="number" />)
      const input = document.querySelector('input[type="number"]')
      expect(input).toBeInTheDocument()
    })

    it('renders search input', () => {
      render(<Input type="search" />)
      expect(screen.getByRole('searchbox')).toBeInTheDocument()
    })

    it('renders tel input', () => {
      render(<Input type="tel" />)
      const input = document.querySelector('input[type="tel"]')
      expect(input).toBeInTheDocument()
    })

    it('renders url input', () => {
      render(<Input type="url" />)
      const input = document.querySelector('input[type="url"]')
      expect(input).toBeInTheDocument()
    })
  })

  describe('States', () => {
    it('can be disabled', () => {
      render(<Input disabled />)
      expect(screen.getByRole('textbox')).toBeDisabled()
    })

    it('is enabled by default', () => {
      render(<Input />)
      expect(screen.getByRole('textbox')).toBeEnabled()
    })

    it('can be read-only', () => {
      render(<Input readOnly value="read only" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('readonly')
      expect(input).toHaveValue('read only')
    })

    it('can be required', () => {
      render(<Input required />)
      expect(screen.getByRole('textbox')).toBeRequired()
    })
  })

  describe('Interactions', () => {
    it('calls onChange when typing', async () => {
      const handleChange = vi.fn()
      const { user } = render(<Input onChange={handleChange} />)

      await user.type(screen.getByRole('textbox'), 'hello')
      expect(handleChange).toHaveBeenCalled()
      expect(handleChange).toHaveBeenCalledTimes(5) // once per character
    })

    it('calls onBlur when focus is lost', async () => {
      const handleBlur = vi.fn()
      const { user } = render(<Input onBlur={handleBlur} />)

      const input = screen.getByRole('textbox')
      await user.click(input)
      await user.tab()

      expect(handleBlur).toHaveBeenCalledTimes(1)
    })

    it('calls onFocus when focused', async () => {
      const handleFocus = vi.fn()
      const { user } = render(<Input onFocus={handleFocus} />)

      await user.click(screen.getByRole('textbox'))
      expect(handleFocus).toHaveBeenCalledTimes(1)
    })

    it('updates value on user input', async () => {
      const { user } = render(<Input />)
      const input = screen.getByRole('textbox')

      await user.type(input, 'test input')
      expect(input).toHaveValue('test input')
    })

    it('does not update value when disabled', async () => {
      const { user } = render(<Input disabled />)
      const input = screen.getByRole('textbox')

      await user.type(input, 'test')
      expect(input).toHaveValue('')
    })

    it('does not update value when read-only', async () => {
      const { user } = render(<Input readOnly value="readonly" />)
      const input = screen.getByRole('textbox')

      await user.type(input, 'test')
      expect(input).toHaveValue('readonly')
    })
  })

  describe('Accessibility', () => {
    it('has textbox role', () => {
      render(<Input />)
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('is keyboard focusable', () => {
      render(<Input />)
      const input = screen.getByRole('textbox')
      input.focus()
      expect(input).toHaveFocus()
    })

    it('is not keyboard focusable when disabled', () => {
      render(<Input disabled />)
      const input = screen.getByRole('textbox')
      input.focus()
      expect(input).not.toHaveFocus()
    })

    it('supports aria-label', () => {
      render(<Input aria-label="Username" />)
      expect(screen.getByLabelText('Username')).toBeInTheDocument()
    })

    it('supports aria-describedby', () => {
      render(
        <div>
          <Input aria-describedby="helper-text" />
          <span id="helper-text">Enter your username</span>
        </div>
      )
      expect(screen.getByRole('textbox')).toHaveAttribute(
        'aria-describedby',
        'helper-text'
      )
    })
  })

  describe('Custom Props', () => {
    it('accepts custom className', () => {
      render(<Input className="custom-input" />)
      expect(screen.getByRole('textbox')).toHaveClass('custom-input')
    })

    it('accepts custom id', () => {
      render(<Input id="username-input" />)
      expect(screen.getByRole('textbox')).toHaveAttribute(
        'id',
        'username-input'
      )
    })

    it('accepts custom name', () => {
      render(<Input name="username" />)
      expect(screen.getByRole('textbox')).toHaveAttribute('name', 'username')
    })

    it('accepts maxLength', () => {
      render(<Input maxLength={10} />)
      expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '10')
    })

    it('accepts minLength', () => {
      render(<Input minLength={3} />)
      expect(screen.getByRole('textbox')).toHaveAttribute('minLength', '3')
    })

    it('accepts pattern', () => {
      render(<Input pattern="[0-9]*" />)
      expect(screen.getByRole('textbox')).toHaveAttribute('pattern', '[0-9]*')
    })
  })

  describe('Controlled Component', () => {
    it('works as controlled component', async () => {
      const handleChange = vi.fn()
      const { rerender, user } = render(
        <Input value="" onChange={handleChange} />
      )

      expect(screen.getByRole('textbox')).toHaveValue('')

      rerender(<Input value="updated" onChange={handleChange} />)
      expect(screen.getByRole('textbox')).toHaveValue('updated')
    })
  })

  describe('Form Integration', () => {
    it('works within a form', async () => {
      const handleSubmit = vi.fn((e) => e.preventDefault())
      const { user } = render(
        <form onSubmit={handleSubmit}>
          <Input name="test-input" />
          <button type="submit">Submit</button>
        </form>
      )

      await user.type(screen.getByRole('textbox'), 'form value')
      await user.click(screen.getByRole('button'))

      expect(handleSubmit).toHaveBeenCalled()
    })
  })
})
