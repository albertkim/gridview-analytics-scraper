import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'
import ts from 'typescript'

// Purpose of this test is to see if I can extract details from Richmond meeting minutes more effectively
(async () => {

  const startUrl = 'https://citycouncil.richmond.ca/agendas/archives/dpp/2019/103019_minutes.htm'

  const browser = await puppeteer.launch({
    headless: true
  })

  const page = await browser.newPage()

  await page.goto(startUrl)

  const result = await page.evaluate(() => {

    const element = document.querySelector('.content')
    if (!element) return ''

    // Clone the element and assert it as HTMLElement
    const clone = element.cloneNode(true) as HTMLElement

    // Find all <a> tags in the clone
    const links = clone.querySelectorAll('a')

    // Replace each <a> tag with its text and href
    links.forEach(link => {
        const text = link.textContent
        const href = link.getAttribute('href')
        link.replaceWith(`[${text}](${new URL(href!, window.location.origin).href})`)
    })

    const finalText = clone.textContent || ''

    const cleanedText = finalText
      .split('\n')
      .map(line => line.trim().replace(/\s+/g, ' '))
      .join('\n')
      .replace(/\n+/g, '\n')

    return cleanedText

  })

  console.log(result)

  fs.writeFileSync(path.join(__dirname, 'richmond-meeting-test.txt'), result)

})()

interface Section {
  title: string;
  content: string;
}

function parseTextToSections(text: string): Section[] {
  const lines = text.split('\n');
  let result: Section[] = [];
  let currentSection: Section | null = null;
  let contentBuffer: string[] = [];

  for (let line of lines) {
      if (isItem(line)) {
          if (currentSection) {
              currentSection.content = contentBuffer.join('\n').trim();
              result.push(currentSection);
              contentBuffer = [];
          }
          currentSection = { title: line.trim(), content: '' };
      } else if (currentSection) {
          contentBuffer.push(line);
      }
  }

  if (currentSection) {
      currentSection.content = contentBuffer.join('\n').trim();
      result.push(currentSection);
  }

  return result;
}

function isItem(line: string): boolean {
  return /^[0-9a-zA-Z]\./.test(line.trim());
}
