## 1.1.1

- Fixed tabbing into overflowing elements, and reduced the chances of the focus getting "stuck"
on unrecognized / unfocusable elements.

## 1.1.0

- Improved the performance of tabbable checking by using `checkVisibility()`
- Allow focus trapping on native controls for things like `<video>` as well as ceding control to `<iframe>`s.

## 1.0.9

- Fixed a bug where tabbing into elements wouldnt scroll it into view.

## 1.0.8

- Fixed a bug where `event.preventDefault()` was being called when the current trap wasn't active.

## 1.0.6

- Fixed a bug where activeElement could change without the focus-trapping utility knowing about it.

## 1.0.5

- Fixed exportmaps in package.json
