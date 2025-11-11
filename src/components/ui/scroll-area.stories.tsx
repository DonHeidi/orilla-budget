import type { Meta, StoryObj } from '@storybook/react'
import { ScrollArea, ScrollBar } from './scroll-area'
import { Separator } from './separator'

const meta = {
  title: 'UI/ScrollArea',
  component: ScrollArea,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ScrollArea>

export default meta
type Story = StoryObj<typeof meta>

const tags = Array.from({ length: 50 }).map(
  (_, i, a) => `v1.2.0-beta.${a.length - i}`
)

export const Default: Story = {
  render: () => (
    <ScrollArea className="h-72 w-48 rounded-md border">
      <div className="p-4">
        <h4 className="mb-4 text-sm font-medium leading-none">Tags</h4>
        {tags.map((tag) => (
          <div key={tag}>
            <div className="text-sm">{tag}</div>
            <Separator className="my-2" />
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
}

export const Horizontal: Story = {
  render: () => (
    <ScrollArea className="w-96 whitespace-nowrap rounded-md border">
      <div className="flex w-max space-x-4 p-4">
        {Array.from({ length: 20 }).map((_, i) => (
          <figure key={i} className="shrink-0">
            <div className="overflow-hidden rounded-md">
              <div className="h-[200px] w-[150px] bg-gradient-to-br from-blue-400 to-purple-400" />
            </div>
            <figcaption className="pt-2 text-xs text-muted-foreground">
              Photo {i + 1}
            </figcaption>
          </figure>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  ),
}

export const LongContent: Story = {
  render: () => (
    <ScrollArea className="h-[600px] w-96 rounded-md border p-4">
      <h4 className="mb-4 text-lg font-semibold">Long Article</h4>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="mb-4">
          <h5 className="mb-2 font-medium">Section {i + 1}</h5>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat. Duis aute irure dolor in
            reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
            pariatur.
          </p>
        </div>
      ))}
    </ScrollArea>
  ),
}

export const CompactList: Story = {
  render: () => (
    <ScrollArea className="h-48 w-64 rounded-md border">
      <div className="p-4">
        <h4 className="mb-4 text-sm font-medium leading-none">Recent Activity</h4>
        <div className="space-y-2">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">Activity {i + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  ),
}

export const TwoAxis: Story = {
  render: () => (
    <ScrollArea className="h-96 w-96 rounded-md border">
      <div className="p-4">
        <h4 className="mb-4 text-sm font-medium">Large Grid</h4>
        <div className="grid grid-cols-10 gap-2">
          {Array.from({ length: 200 }).map((_, i) => (
            <div
              key={i}
              className="h-12 w-12 rounded-md bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-xs"
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  ),
}

export const CodeBlock: Story = {
  render: () => (
    <ScrollArea className="h-72 w-full max-w-2xl rounded-md border bg-gray-950 p-4">
      <pre className="text-sm text-gray-50">
        <code>{`function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Generate first 20 Fibonacci numbers
const fibs = [];
for (let i = 0; i < 20; i++) {
  fibs.push(fibonacci(i));
}

console.log(fibs);
// [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181]

// More efficient iterative approach
function fibonacciIterative(n) {
  if (n <= 1) return n;

  let prev = 0;
  let curr = 1;

  for (let i = 2; i <= n; i++) {
    const next = prev + curr;
    prev = curr;
    curr = next;
  }

  return curr;
}

// Time complexity: O(n)
// Space complexity: O(1)`}</code>
      </pre>
    </ScrollArea>
  ),
}
