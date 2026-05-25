import Parser from 'rss-parser';
import { parse as parseHtml, HTMLElement } from 'node-html-parser';
const FEED_URL = 'https://thisweekinreact.com/newsletter/rss.xml';
export async function fetchLatestIssue() {
    const parser = new Parser();
    const feed = await parser.parseURL(FEED_URL);
    const first = feed.items?.[0];
    if (!first)
        throw new Error('No items found in feed.');
    return buildNewsletter(first);
}
export async function fetchLatestIssues(count) {
    const parser = new Parser();
    const feed = await parser.parseURL(FEED_URL);
    const items = (feed.items || []).slice(0, count);
    if (items.length === 0)
        throw new Error('No items found in feed.');
    return items.map(buildNewsletter);
}
export async function fetchIssue(issueNumber) {
    const parser = new Parser();
    const feed = await parser.parseURL(FEED_URL);
    const match = feed.items?.find((i) => i.link?.endsWith(`/${issueNumber}`));
    if (!match)
        throw new Error(`Issue #${issueNumber} not found in feed.`);
    return buildNewsletter(match);
}
export async function fetchLatestIssueNumbers(count) {
    const parser = new Parser();
    const feed = await parser.parseURL(FEED_URL);
    return (feed.items || [])
        .slice(0, count)
        .map((it) => parseInt((it.link || '').split('/').pop() || '0', 10))
        .filter((n) => n > 0);
}
function buildNewsletter(item) {
    const title = item.title || 'Untitled';
    const url = item.link || '';
    const issueNumber = parseInt(url.split('/').pop() || '0', 10);
    const html = item['content:encoded'] || item.content || '';
    const { intro, items } = extractItems(html);
    return {
        issueNumber,
        title,
        url,
        pubDate: item.pubDate || '',
        intro,
        items,
    };
}
const YOUTUBE_HOSTS = ['youtube.com', 'youtu.be', 'music.youtube.com'];
function isYoutube(url) {
    try {
        const u = new URL(url);
        return YOUTUBE_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith('.' + h));
    }
    catch {
        return false;
    }
}
function isSponsorSection(section) {
    return /sponsor/i.test(section);
}
function extractItems(html) {
    const root = parseHtml(html);
    const items = [];
    let intro = '';
    let currentSection = 'Intro';
    let currentEmoji = '';
    let introCollected = false;
    let featuredCapturedForSection = false;
    let featuredDescBuffer = [];
    let lastFeaturedItem = null;
    const flushFeaturedDesc = () => {
        if (lastFeaturedItem && featuredDescBuffer.length > 0) {
            lastFeaturedItem.rawText = (lastFeaturedItem.rawText + ' ' + featuredDescBuffer.join(' ')).trim();
        }
        featuredDescBuffer = [];
    };
    for (const node of root.childNodes) {
        if (!(node instanceof HTMLElement))
            continue;
        const tag = node.tagName?.toLowerCase();
        if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
            flushFeaturedDesc();
            lastFeaturedItem = null;
            const text = cleanText(node.text);
            currentSection = text;
            currentEmoji = leadingEmoji(text);
            introCollected = true;
            featuredCapturedForSection = false;
            continue;
        }
        if (!introCollected && tag === 'p') {
            const txt = cleanText(node.text);
            if (txt)
                intro += (intro ? '\n' : '') + txt;
            continue;
        }
        if (tag === 'p' && !isSponsorSection(currentSection)) {
            const strong = node.querySelector('strong');
            const strongLink = strong?.querySelector('a');
            if (!featuredCapturedForSection && strongLink) {
                const url = strongLink.getAttribute('href') || '';
                const title = cleanText(strongLink.text);
                if (title && url && !isYoutube(url)) {
                    const featured = {
                        section: currentSection,
                        sectionEmoji: currentEmoji,
                        itemEmoji: '⭐',
                        title,
                        url,
                        rawText: cleanText(node.text),
                    };
                    items.push(featured);
                    lastFeaturedItem = featured;
                    featuredCapturedForSection = true;
                    continue;
                }
            }
            if (lastFeaturedItem && !strongLink) {
                const txt = cleanText(node.text);
                if (txt && featuredDescBuffer.join(' ').length < 600) {
                    featuredDescBuffer.push(txt);
                }
                continue;
            }
        }
        if (tag === 'ul' || tag === 'ol') {
            const lis = node.querySelectorAll('li');
            const linkBearing = lis.filter((li) => li.querySelector('a'));
            // Skip feature-bullet lists under a featured item (no <a> in any li).
            if (lastFeaturedItem && linkBearing.length === 0)
                continue;
            flushFeaturedDesc();
            lastFeaturedItem = null;
            for (const li of lis) {
                const item = extractItemFromLi(li, currentSection, currentEmoji);
                if (!item)
                    continue;
                if (isYoutube(item.url))
                    continue;
                if (isSponsorSection(item.section))
                    continue;
                items.push(item);
            }
        }
    }
    flushFeaturedDesc();
    return { intro: intro.slice(0, 600), items };
}
function extractItemFromLi(li, section, sectionEmoji) {
    const link = li.querySelector('a');
    if (!link)
        return null;
    const url = link.getAttribute('href') || '';
    const title = cleanText(link.text);
    if (!title)
        return null;
    const fullText = cleanText(li.text);
    const itemEmoji = leadingEmoji(fullText);
    return { section, sectionEmoji, itemEmoji, title, url, rawText: fullText };
}
function leadingEmoji(s) {
    // Grab the first emoji-ish glyph cluster at the start of the string.
    const m = s.match(/^([\p{Extended_Pictographic}‍️]+)/u);
    return m ? m[1] : '';
}
function cleanText(s) {
    return s
        .replace(/ /g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
