-- Copyright (c) 2015-present, Facebook, Inc.
-- This source code is licensed under the MIT license found at
-- https://github.com/facebook/create-react-app/blob/main/LICENSE

property targetTab: null
property targetTabIndex: -1
property targetWindow: null

on run argv
  set theURL to item 1 of argv

  with timeout of 2 seconds
    tell application "Chrome"

      if (count every window) = 0 then
        make new window
      end if

      -- Option 1: Activate a tab running the targeted URL
      set found to my lookupTabWithUrl(theURL)
      if found then
        set targetWindow's active tab index to targetTabIndex
        tell targetTab to reload
        tell targetWindow to activate
        set index of targetWindow to 1
        return
      end if

      -- Option 2: Use an empty new tab
      set found to my lookupTabWithUrl("chrome://newtab/")
      if found then
        set targetWindow's active tab index to targetTabIndex
        set URL of targetTab to theURL
        tell targetWindow to activate
        return
      end if

      -- Option 3: Create a new tab
      tell window 1
        activate
        make new tab with properties {URL:theURL}
      end tell
    end tell
  end timeout
end run

-- Function: Find tab with given url
-- if found, store tab, index, and window in properties (declared on top of file)
on lookupTabWithUrl(lookupUrl)
  tell application "Chrome"
    set found to false
    set theTabIndex to -1
    repeat with theWindow in every window
      set theTabIndex to 0
      repeat with theTab in every tab of theWindow
        set theTabIndex to theTabIndex + 1
        if (theTab's URL as string) contains lookupUrl then
          -- assign tab, tab index, and window to properties
          set targetTab to theTab
          set targetTabIndex to theTabIndex
          set targetWindow to theWindow
          set found to true
          exit repeat
        end if
      end repeat

      if found then
        exit repeat
      end if
    end repeat
  end tell
  return found
end lookupTabWithUrl
