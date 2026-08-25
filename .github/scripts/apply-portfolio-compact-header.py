from pathlib import Path

root = Path('.')

# Opt every Portfolio-owned global header into the package-owned compact utility expression.
html_paths = [root / 'index.html', *sorted((root / 'projects').rglob('*.html'))]
updated = 0
for path in html_paths:
    if not path.is_file():
        continue
    content = path.read_text()
    old = 'class="jl-global-header"'
    new = 'class="jl-global-header jl-global-header--compact-utility"'
    if old in content:
        content = content.replace(old, new)
        path.write_text(content)
        updated += 1

if updated == 0:
    raise SystemExit('No Portfolio global headers were opted into the compact utility expression.')

# Keep the visual contract exact for the local candidate while allowing production
# to be either the current 82px header or the new 72px header during deployment rollout.
workflow_path = root / '.github/workflows/visual-audit.yml'
workflow = workflow_path.read_text()

old = '''            const expectedInnerHeight = compactHeader ? 68 : 82;
            const expectedOuterHeight = compactHeader ? 69 : 83;
            const expectedButtonHeight = compactHeader ? 40 : 44;
            const fittedSitesWidth = metrics.viewportWidth <= 360 ? 96 : 104;
            const legacySitesWidth = metrics.viewportWidth <= 420 ? 116 : 136;
            if (metrics.overflow) problems.push('document overflow');
            if (metrics.h1Count !== 1) problems.push(`expected one h1, found ${metrics.h1Count}`);
            if (!near(metrics.headerInnerHeight, expectedInnerHeight)) problems.push(`header inner ${metrics.headerInnerHeight}, expected ${expectedInnerHeight}`);
            if (!near(metrics.headerHeight, expectedOuterHeight)) problems.push(`header outer ${metrics.headerHeight}, expected ${expectedOuterHeight}`);
'''
new = '''            const expectedInnerHeights = compactHeader
              ? [68]
              : screenshotPrefix === 'local' ? [72] : [72, 82];
            const expectedOuterHeights = compactHeader
              ? [69]
              : screenshotPrefix === 'local' ? [73] : [73, 83];
            const expectedButtonHeight = compactHeader ? 40 : 44;
            const fittedSitesWidth = metrics.viewportWidth <= 360
              ? 96
              : metrics.viewportWidth > 560 ? 96 : 104;
            const legacySitesWidth = metrics.viewportWidth <= 420 ? 116 : 136;
            if (metrics.overflow) problems.push('document overflow');
            if (metrics.h1Count !== 1) problems.push(`expected one h1, found ${metrics.h1Count}`);
            if (!expectedInnerHeights.some((value) => near(metrics.headerInnerHeight, value))) problems.push(`header inner ${metrics.headerInnerHeight}, expected ${expectedInnerHeights.join(' or ')}`);
            if (!expectedOuterHeights.some((value) => near(metrics.headerHeight, value))) problems.push(`header outer ${metrics.headerHeight}, expected ${expectedOuterHeights.join(' or ')}`);
'''
if old not in workflow:
    raise SystemExit('Visual audit header geometry block drifted.')
workflow = workflow.replace(old, new, 1)

old = '''              const widthAllowed = screenshotPrefix === 'local'
                ? near(metrics.sitesButton.width, fittedSitesWidth)
                : near(metrics.sitesButton.width, fittedSitesWidth) || near(metrics.sitesButton.width, legacySitesWidth) || near(metrics.sitesButton.width, 88);
'''
new = '''              const widthAllowed = screenshotPrefix === 'local'
                ? near(metrics.sitesButton.width, fittedSitesWidth)
                : near(metrics.sitesButton.width, fittedSitesWidth) || near(metrics.sitesButton.width, 104) || near(metrics.sitesButton.width, legacySitesWidth) || near(metrics.sitesButton.width, 88);
'''
if old not in workflow:
    raise SystemExit('Visual audit Sites width block drifted.')
workflow = workflow.replace(old, new, 1)

old = '''              const expectedOpenSitesWidth = sitesOpenGeometry.viewportWidth <= 360 ? 96 : 104;
'''
new = '''              const expectedOpenSitesWidth = sitesOpenGeometry.viewportWidth <= 360
                ? 96
                : sitesOpenGeometry.viewportWidth > 560 ? 96 : 104;
'''
if old not in workflow:
    raise SystemExit('Visual audit open Sites width block drifted.')
workflow = workflow.replace(old, new, 1)

# Add a focused local desktop check for the package-owned utility cluster itself.
old = '''              sitesButton: (() => {
                const element = document.querySelector('.jl-site-switcher__button');
                if (!(element instanceof HTMLElement)) return null;
                const rect = element.getBoundingClientRect();
                const style = getComputedStyle(element);
                return { width: rect.width, height: rect.height, fontSize: style.fontSize, fontWeight: style.fontWeight };
              })(),
'''
new = '''              sitesButton: (() => {
                const element = document.querySelector('.jl-site-switcher__button');
                if (!(element instanceof HTMLElement)) return null;
                const rect = element.getBoundingClientRect();
                const style = getComputedStyle(element);
                return { width: rect.width, height: rect.height, fontSize: style.fontSize, fontWeight: style.fontWeight };
              })(),
              utilityCluster: (() => {
                const cluster = document.querySelector('.jl-global-header--compact-utility .jl-site-switcher');
                const sites = document.querySelector('.jl-global-header--compact-utility .jl-site-disclosure');
                const settings = document.querySelector('.jl-global-header--compact-utility .jl-settings-disclosure');
                if (!(cluster instanceof HTMLElement) || !(sites instanceof HTMLElement) || !(settings instanceof HTMLElement)) return null;
                const clusterRect = cluster.getBoundingClientRect();
                const sitesRect = sites.getBoundingClientRect();
                const settingsRect = settings.getBoundingClientRect();
                const style = getComputedStyle(cluster);
                return {
                  width: clusterRect.width,
                  columnGap: style.columnGap,
                  sitesRight: sitesRect.right,
                  settingsLeft: settingsRect.left,
                };
              })(),
'''
if old not in workflow:
    raise SystemExit('Visual audit Sites metrics block drifted.')
workflow = workflow.replace(old, new, 1)

anchor = '''            if (!metrics.sitesButton) {
              problems.push('Sites button missing');
            } else {
'''
addition = '''            if (screenshotPrefix === 'local' && !compactHeader) {
              if (!metrics.utilityCluster) {
                problems.push('compact utility cluster missing');
              } else {
                if (!near(metrics.utilityCluster.width, 142)) problems.push(`utility cluster width ${metrics.utilityCluster.width}, expected 142`);
                if (metrics.utilityCluster.columnGap !== '0px') problems.push(`utility cluster gap ${metrics.utilityCluster.columnGap}`);
                if (!near(metrics.utilityCluster.sitesRight, metrics.utilityCluster.settingsLeft)) problems.push('Sites and Settings are not directly adjacent');
              }
            }

'''
if anchor not in workflow:
    raise SystemExit('Visual audit Sites anchor drifted.')
workflow = workflow.replace(anchor, addition + anchor, 1)
workflow_path.write_text(workflow)

# Make the package-owned opt-in an explicit integration requirement so it cannot
# silently disappear while local header CSS remains forbidden.
validator_path = root / 'scripts/validate-design-system-integration.mjs'
validator = validator_path.read_text()
old_marker = ''''class="jl-global-header"'''
new_marker = ''''class="jl-global-header jl-global-header--compact-utility"'''
if old_marker not in validator:
    raise SystemExit('Portfolio header integration markers drifted.')
validator = validator.replace(old_marker, new_marker)

anchor = '''if (!attachedHeaderGeometry) fail("Shared header geometry is not the approved attached-width Sites contract.");
'''
addition = '''if (!identityStyles.includes(".jl-global-header--compact-utility") || !identityStyles.includes("grid-template-columns: 96px var(--jl-control-height-md);")) {
  fail("Shared compact utility header expression is missing from the synced package assets.");
}
'''
if anchor not in validator:
    raise SystemExit('Portfolio integration geometry anchor drifted.')
validator = validator.replace(anchor, anchor + addition, 1)
validator_path.write_text(validator)
