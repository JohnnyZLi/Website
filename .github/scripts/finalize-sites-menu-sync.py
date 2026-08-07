#!/usr/bin/env python3
from pathlib import Path
import json

# Theme audit: trigger and dropdown are intentionally different widths.
theme = Path('scripts/theme-visual-audit.mjs')
s = theme.read_text()
s = s.replace(
'''          return {
            sitesExpanded: button?.getAttribute("aria-expanded"),
            settingsExpanded: document.querySelector("[data-settings-button]")?.getAttribute("aria-expanded"),
            buttonWidth: button?.getBoundingClientRect().width ?? null,
            menuWidth: menu?.getBoundingClientRect().width ?? null,
            documentWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
            linkOverflow: links.some((link) => link.scrollWidth > link.clientWidth + 1),
            linkWrapping: links.some((link) => getComputedStyle(link).whiteSpace !== "nowrap"),
          };''',
'''          const menuRect = menu?.getBoundingClientRect();
          return {
            sitesExpanded: button?.getAttribute("aria-expanded"),
            settingsExpanded: document.querySelector("[data-settings-button]")?.getAttribute("aria-expanded"),
            buttonWidth: button?.getBoundingClientRect().width ?? null,
            menuWidth: menuRect?.width ?? null,
            menuLeft: menuRect?.left ?? null,
            menuRight: menuRect?.right ?? null,
            documentWidth: document.documentElement.scrollWidth,
            innerWidth: window.innerWidth,
            linkOverflow: links.some((link) => link.scrollWidth > link.clientWidth + 1),
            linkWrapping: links.some((link) => getComputedStyle(link).whiteSpace !== "nowrap"),
          };''')
s = s.replace(
'''        if (!near(sitesOpen.buttonWidth, sitesOpen.menuWidth)) problems.push("Sites extension does not match its trigger width");
        if (sitesOpen.linkOverflow || sitesOpen.linkWrapping) problems.push("Sites labels do not fit the attached extension");''',
'''        if (!near(sitesOpen.buttonWidth, 88)) problems.push(`Sites trigger width ${sitesOpen.buttonWidth}`);
        if (!near(sitesOpen.menuWidth, 144)) problems.push(`Sites dropdown width ${sitesOpen.menuWidth}`);
        if (sitesOpen.menuLeft < -0.5 || sitesOpen.menuRight > sitesOpen.innerWidth + 0.5) problems.push("Sites dropdown escapes the viewport");
        if (sitesOpen.linkOverflow || sitesOpen.linkWrapping) problems.push("Sites labels do not fit the dropdown");''')
theme.write_text(s)

# The only technical-report visual changes are the intentional shared-header geometry.
baseline = Path('scripts/technical-report-visual-baseline.json')
data = json.loads(baseline.read_text())
data['hashes'] = {
    'desktop': '6165ef274bfdcf537618e588fc65443338aa7f64e912ca3a5b2760578b534aad',
    'narrow-desktop': '269b63b4e8643a19db3ab9cae27eb27ba41045b1a1c7cebe4c72f1ff04f89877',
    'mobile': '7c390d1f19d759edd5fa5bbd1c8d22192d20d94e4b53e06af60404169353bd7c',
    'minimum': 'fd9d42ca54d81334557b374373cf8aeaa40b096188cd518706a564e9f2d030f3',
    'forced-colors': 'fb051bc244cd8aeabeb6ba6f9402da5a6c827b15b3e806520002f74abf0cb762',
}
baseline.write_text(json.dumps(data, indent=2) + '\n')
