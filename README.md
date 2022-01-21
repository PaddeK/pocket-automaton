# Pocket Automaton 
Automaticly parses known pocket ips patch resources, scans folders or zip files for matching roms and applies the patches.

# Usage
```bash
pocket-automaton v1.0.0 

Usage: pocket-automaton [options] 

Options:
    --tmpDir      <directory> for temporary rom backup [default: D:\Projects\pocket\tmp]
    --romSrc      <directory> or <zip file> to scan for *.gb/*.gbc files                  [array] [required]
    --pocketDir   <directory> to write *.pocket files                                             [required]
    --progress    Show progress [default: true]                                                    [boolean]
    --version     Show version                                                                     [boolean]
    --help        Show help                                                                        [boolean]
```
# Example 
#### With npm exec:
```bash
npm exec -- @paddek/pocket-automaton --romSrc D:\Downloads\mister\gb\Gameboy\ --pocketDir ./pocket
```

#### With npx:
```bash
npx @paddek/pocket-automaton --romSrc C:\Users\me\backup-roms --romSrc C:\Users\me\zips\gb.zip --pocketDir .\pocket
```

#### After global install:
```bash
pocket-automaton --romSrc C:\Users\me\backup-roms --romSrc C:\Users\me\zips\gb.zip --pocketDir .\pocket
```