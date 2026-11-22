import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Markdown } from '@/components/Markdown'

describe('Markdown', () => {
  it('ignores raw HTML', () => {
    const { container } = render(
      <Markdown>{'<script>alert(1)</script><img src=x onerror="alert(1)">\n\n**bold**'}</Markdown>,
    )
    expect(container.querySelector('script, img')).toBeNull()
    expect(container.querySelector('strong')).toHaveTextContent('bold')
  })

  it('drops javascript: links and opens real links safely', () => {
    const { container } = render(
      <Markdown>{'[bad](javascript:alert(1)) [good](https://example.com)'}</Markdown>,
    )
    const [bad, good] = container.querySelectorAll('a')
    expect(bad?.getAttribute('href') ?? '').not.toMatch(/javascript/i)
    expect(good).toHaveAttribute('href', 'https://example.com')
    expect(good).toHaveAttribute('rel', 'noopener noreferrer nofollow ugc')
  })
})
