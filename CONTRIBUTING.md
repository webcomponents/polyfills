# Filing bugs

If you find an issue, please do file it on the repository. The [webcomponents/shadydom issues](https://github.com/webcomponents/shadydom/issues) should be used only for issues with shadydom itself - bugs related to creating shadowRoots.

Please file issues using the issue template provided, filling out as many fields as possible.  We love examples for addressing issues - issues with a Plunkr, jsFiddle, or jsBin will be much easier for us to work on quickly. You can start with [this jsbin](http://jsbin.com/caxiwoc/edit?html,console,output) which sets up the basics to create a custom element with a shadowRoot.

Occasionally we'll close issues if they appear stale or are too vague - please don't take this personally! Please feel free to re-open issues we've closed if there's something we've missed and they still need to be addressed.

# Contributing Pull Requests

PR's are even better than issues. We gladly accept community pull requests. In general, there are a few necessary steps before we can accept a pull request:

- Open an issue describing the problem that you are looking to solve in your PR (if one is not already open), and your approach to solving it. This makes it easier to have a conversation around the best general approach for solving your problem, outside of the code itself.
- Fork the repo you're making the fix on to your own GitHub account.
- Code!
- Ideally, squash your commits into a single commit with a clear message of what the PR does. If it absolutely makes sense to keep multiple commits, that's OK - or perhaps consider making two separate PR's.
- **Include tests that test the range of behavior that changes with your PR.** If you PR fixes a bug, make sure your tests capture that bug. If your PR adds new behavior, make sure that behavior is fully tested. Every PR *must* include associated tests.
- Submit your PR, making sure it references the issue you created.
- If your PR fixes a bug, make sure the issue includes clear steps to reproduce the bug so we can test your fix.

If you've completed all of these steps we will do its best to respond to the PR as soon as possible.
