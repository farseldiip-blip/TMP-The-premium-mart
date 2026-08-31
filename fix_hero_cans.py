import re

with open('D:/code/TMP-The premium mart/site/css/style.css', 'r') as f:
    css = f.read()

# 1. Add .hero-cans wrapper inside .tpm-hero-visual
#    - Will be centered with text-align:center
    #    - Will have position:relative for absolute children
#    - Will have width:100% and max-width for responsiveness

# Find the .tpm-hero-visual rule and add .hero-cans as a child pattern
# Actually, let me modify the .tpm-can-stage rule and add .hero-cans

# Step 1: Modify .tpm-can-stage to be the hero-cans wrapper
# Current: .tpm-can-stage{ position:relative; width:min(360px, 90vw); height:380px; display:block; perspective:1000px; transform-style:preserve-3d; overflow:visible; }
# New: .tpm-can-stage{ position:relative; width:min(360px, 90vw); height:auto; display:flex; justify-content:center; align-items:flex-end; gap:24px; overflow:visible; }

# Step 2: Modify .tpm-can rules to be position:relative and remove absolute positioning
# Current: .tpm-can{ position:absolute; display:block; padding:0; background:transparent; border:none; border-radius:0; overflow:visible; isolation:isolate; filter: drop-shadow(0 18px 22px rgba(0,0,0,.26)); }
# New: .tpm-can{ position:relative; display:block; padding:0; background:transparent; border:none; border-radius:0; overflow:visible; isolation:isolate; filter: drop-shadow(0 18px 22px rgba(0,0,0,.26)); }

# Step 3: Remove the ::before pseudo-shadows or make them simpler
# Actually, let me keep the shadows but make them work with the new layout

# Step 4: Position cans relatively within the wrapper
# Mango: left:0, Strawberry: right:0, Blue Ocean: center with auto margin

# Let me do this step by step

# First, replace the .tpm-can-stage rule
old_can_stage = '.tpm-can-stage{position:relative;width:min(360px, 90vw);height:380px;display:block;perspective:1000px;transform-style:preserve-3d;overflow:visible}'
new_can_stage = '.tpm-can-stage{position:relative;width:min(360px, 90vw);height:auto;display:flex;justify-content:center;align-items:flex-end;gap:24px;overflow:visible}'

css = css.replace(old_can_stage, new_can_stage)

# Now modify .tpm-can to be position:relative
old_can = '.tpm-can{position:absolute;display:block;padding:0;background:transparent;border:none;border-radius:0;overflow:visible;isolation:isolate;filter:drop-shadow(0 18px 22px rgba(0,0,0,.26))}'
new_can = '.tpm-can{position:relative;display:block;padding:0;background:transparent;border:none;border-radius:0;overflow:visible;isolation:isolate;filter:drop-shadow(0 18px 22px rgba(0,0,0,.26))}'
css = css.replace(old_can, new_can)

# Now modify the individual can rules to be relative within the wrapper
# Remove left/right/top absolute positioning and use flexible layout

# For .can-mango: move to left side, relatively smaller
# .can-blue: center, largest
# .can-strawberry: right side

# Let me replace the specific can rules
# First, mango
old_mango = '.can-mango{left:1%;top:48px;width:260px;height:300px}'
new_mango = '.can-mango{position:relative;left:0;top:0;width:240px;height:280px}'
css = css.replace(old_mango, new_mango)

# Blue Ocean - center with auto margin
old_blue = '.can-blue{left:50%;top:-4px;width:345px;height:391px}'
new_blue = '.can-blue{position:relative;left:50%;top:0;margin-left:-120px;width:300px;height:340px}'
css = css.replace(old_blue, new_blue)

# Strawberry
old_strawberry = '.can-strawberry{right:1%;top:54px;width:310px;height:345px}'
new_strawberry = '.can-strawberry{position:relative;right:0;top:0;width:240px;height:280px}'
css = css.replace(old_strawberry, new_strawberry)

# Also fix the can images to use width:100% height:auto instead of fixed
old_img = '.tpm-can img{width:100%;height:100%;display:block;object-fit:contain;object-position:center center;image-rendering:auto}'
new_img = '.tpm-can img{width:100%;height:auto;display:block;object-fit:contain;object-position:center center;image-rendering:auto}'
css = css.replace(old_img, new_img)

# Remove the ::before pseudo-shadows or simplify them
# Actually the ::before creates the colored glow under each can
# Let me keep them but they should work with relative positioning

# Fix the mango ::before
old_mango_before = '.can-mango::before{background:radial-gradient(ellipse at center, rgba(255,200,58,.42) 0%, rgba(255,160,30,.18) 38%, transparent 72%)}'
# Keep it, it should work with relative positioning

# Fix blue ::before
old_blue_before = '.can-blue::before{background:radial-gradient(ellipse at center, rgba(42,167,224,.38) 0%, rgba(42,167,224,.16) 36%, transparent 70%)}'
# Keep it

# Fix strawberry ::before
old_strawberry_before = '.can-strawberry::before{background:radial-gradient(ellipse at center, rgba(233,69,69,.36) 0%, rgba(233,69,69,.14) 36%, transparent 70%)}'
# Keep it

# Fix the tpm-can-stage::after (the gradient bar at bottom)
old_stage_after = '.tpm-can-stage::after{content:"";position:absolute;left:50%;bottom:10px;transform:translateX(-50%);width:72%;height:30px;background:radial-gradient(ellipse at center,rgba(14,26,20,.20) 0%,rgba(14,26,20,.09) 38%,transparent 72%);filter:blur(8px);z-index:0;pointer-events:none;opacity:.9}'
# This positions the bottom gradient - need to adjust since cans are now relatively positioned
# Actually the ::after is on the stage, not the cans, so it should be fine

print(f'CSS modified, length: {len(css)}')
with open('D:/code/TMP-The premium mart/site/css/style.css', 'w') as f:
    f.write(css)
print('CSS updated successfully')
"