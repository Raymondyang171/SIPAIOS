# CLAUDE.md - AI Assistant Guide for SIPAIOS

**Last Updated:** 2026-01-24
**Project:** SIPAIOS
**Status:** Initial Setup

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Repository Structure](#repository-structure)
3. [Development Workflow](#development-workflow)
4. [Code Conventions](#code-conventions)
5. [Architecture Guidelines](#architecture-guidelines)
6. [Testing Strategy](#testing-strategy)
7. [Git Workflow](#git-workflow)
8. [AI Assistant Guidelines](#ai-assistant-guidelines)
9. [Common Tasks](#common-tasks)
10. [Resources](#resources)

---

## Project Overview

### About
SIPAIOS is an iOS application currently in initial setup phase. This document serves as a comprehensive guide for AI assistants to understand the codebase structure, development workflows, and conventions.

### Technology Stack
- **Platform:** iOS
- **Primary Language:** Swift (expected)
- **Development Tool:** Xcode
- **Dependency Management:** CocoaPods / Swift Package Manager (to be determined)
- **Version Control:** Git

### Project Goals
*To be documented as the project develops*

---

## Repository Structure

### Expected Directory Layout

```
SIPAIOS/
├── .git/                          # Git repository metadata
├── SIPAIOS/                       # Main application directory
│   ├── App/                       # Application entry point
│   │   ├── AppDelegate.swift
│   │   └── SceneDelegate.swift
│   ├── Models/                    # Data models
│   ├── Views/                     # UI components
│   ├── ViewControllers/           # View controllers
│   ├── Services/                  # Business logic and API services
│   ├── Utilities/                 # Helper functions and extensions
│   ├── Resources/                 # Assets, fonts, colors
│   │   ├── Assets.xcassets
│   │   └── Localizable.strings
│   └── Supporting Files/
├── Tests/                         # Unit tests
├── UITests/                       # UI tests
├── Podfile                        # CocoaPods dependencies (if used)
├── Package.swift                  # Swift Package dependencies (if used)
├── .gitignore
├── README.md
└── CLAUDE.md                      # This file
```

### Key Directories

- **App/**: Contains application lifecycle files (AppDelegate, SceneDelegate)
- **Models/**: Data structures and business entities
- **Views/**: Reusable UI components, custom views, and SwiftUI views
- **ViewControllers/**: UIKit view controllers
- **Services/**: API clients, networking, data persistence, authentication
- **Utilities/**: Extensions, helpers, constants, and utility functions
- **Resources/**: Images, colors, fonts, localization files

---

## Development Workflow

### Branch Strategy

- **Main Branch:** `main` (production-ready code)
- **Development Branch:** `develop` (integration branch)
- **Feature Branches:** `feature/feature-name` or `claude/claude-md-*` for AI-assisted development
- **Bug Fix Branches:** `bugfix/issue-description`
- **Hotfix Branches:** `hotfix/critical-fix`

### Development Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/feature-name
   ```

2. **Develop & Test**
   - Write code following conventions
   - Add unit tests for new functionality
   - Test on simulator and devices

3. **Commit Changes**
   ```bash
   git add .
   git commit -m "Type: Brief description"
   ```

4. **Push & Create PR**
   ```bash
   git push -u origin feature/feature-name
   ```

### Commit Message Format

```
Type: Brief description

Detailed explanation of changes (if needed)

- Bullet points for multiple changes
- Reference issues: #123
```

**Commit Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `style`: Code style changes (formatting)
- `chore`: Maintenance tasks

---

## Code Conventions

### Swift Style Guide

Follow [Swift API Design Guidelines](https://swift.org/documentation/api-design-guidelines/) and common iOS conventions:

#### Naming Conventions

```swift
// Classes, Structs, Enums, Protocols: UpperCamelCase
class UserProfileViewController: UIViewController { }
struct UserModel { }
enum NetworkError { }
protocol DataSourceProtocol { }

// Variables, Functions, Constants: lowerCamelCase
let userName: String
func fetchUserData() { }
var isLoading: Bool = false

// Constants: lowerCamelCase (not SCREAMING_SNAKE_CASE)
let maxRetryCount = 3
let defaultTimeout = 30.0
```

#### Code Organization

```swift
// MARK: - Protocol conformance using extensions
class MyViewController: UIViewController {
    // MARK: - Properties
    private let tableView = UITableView()

    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
    }

    // MARK: - Setup
    private func setupUI() { }

    // MARK: - Actions
    @objc private func buttonTapped() { }
}

// MARK: - UITableViewDataSource
extension MyViewController: UITableViewDataSource {
    // Implementation
}

// MARK: - UITableViewDelegate
extension MyViewController: UITableViewDelegate {
    // Implementation
}
```

#### Access Control

- Use `private` for implementation details
- Use `fileprivate` when needed within the same file
- Use `internal` (default) for internal module access
- Use `public` for framework/library interfaces
- Avoid `open` unless explicitly needed for subclassing

#### Optionals

```swift
// Prefer optional binding over force unwrapping
if let user = user {
    print(user.name)
}

// Use guard for early returns
guard let data = data else { return }

// Avoid force unwrapping (!)
// ❌ let name = user!.name
// ✅ let name = user?.name
```

#### Error Handling

```swift
// Use Swift's error handling
enum NetworkError: Error {
    case invalidURL
    case noData
    case decodingFailed
}

func fetchData() throws -> Data {
    guard let url = URL(string: urlString) else {
        throw NetworkError.invalidURL
    }
    // Implementation
}

// Handle errors
do {
    let data = try fetchData()
} catch {
    print("Error: \(error)")
}
```

---

## Architecture Guidelines

### Recommended Patterns

#### MVC (Model-View-Controller)
Standard iOS pattern for UIKit applications:
- **Model**: Data and business logic
- **View**: UI components
- **Controller**: Mediates between Model and View

#### MVVM (Model-View-ViewModel)
Recommended for SwiftUI and modern UIKit:
- **Model**: Data structures
- **View**: UI layer
- **ViewModel**: Presentation logic, data transformation

#### Coordinator Pattern
For navigation flow management:
- Separates navigation logic from view controllers
- Improves testability and reusability

### Dependency Injection

```swift
// Protocol-based dependency injection
protocol NetworkServiceProtocol {
    func fetchData(completion: @escaping (Result<Data, Error>) -> Void)
}

class ViewModel {
    private let networkService: NetworkServiceProtocol

    init(networkService: NetworkServiceProtocol) {
        self.networkService = networkService
    }
}
```

### Networking

```swift
// Use URLSession for networking
// Consider using Alamofire for complex requirements
// Implement proper error handling and response parsing

class APIClient {
    static let shared = APIClient()

    func request<T: Decodable>(
        endpoint: String,
        completion: @escaping (Result<T, Error>) -> Void
    ) {
        // Implementation
    }
}
```

### Data Persistence

- **UserDefaults**: Simple key-value storage
- **Core Data**: Complex object graphs and relationships
- **Keychain**: Sensitive data (passwords, tokens)
- **FileManager**: File-based storage

---

## Testing Strategy

### Unit Tests

```swift
import XCTest
@testable import SIPAIOS

class ViewModelTests: XCTestCase {
    var sut: ViewModel!
    var mockService: MockNetworkService!

    override func setUp() {
        super.setUp()
        mockService = MockNetworkService()
        sut = ViewModel(networkService: mockService)
    }

    override func tearDown() {
        sut = nil
        mockService = nil
        super.tearDown()
    }

    func testFetchData_Success() {
        // Given
        let expectedData = MockData()
        mockService.mockResult = .success(expectedData)

        // When
        sut.fetchData()

        // Then
        XCTAssertEqual(sut.data, expectedData)
    }
}
```

### UI Tests

```swift
import XCTest

class SIPAIOSUITests: XCTestCase {
    var app: XCUIApplication!

    override func setUp() {
        super.setUp()
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
    }

    func testLoginFlow() {
        // Test UI interactions
    }
}
```

### Testing Guidelines

- Aim for 80%+ code coverage on business logic
- Test edge cases and error conditions
- Use mocks and stubs for external dependencies
- Keep tests fast and independent
- Follow AAA pattern: Arrange, Act, Assert

---

## Git Workflow

### Branch Naming

- Feature: `feature/user-authentication`
- Bug Fix: `bugfix/crash-on-login`
- Hotfix: `hotfix/critical-security-patch`
- AI-Assisted: `claude/claude-md-[session-id]`

### Git Commands

```bash
# Create and switch to new branch
git checkout -b feature/feature-name

# Stage changes
git add .

# Commit with message
git commit -m "feat: Add user authentication"

# Push to remote (first time)
git push -u origin feature/feature-name

# Push subsequent changes
git push

# Pull latest changes
git pull origin main

# Rebase with main
git fetch origin
git rebase origin/main
```

### Git Best Practices

1. **Commit Often**: Small, focused commits
2. **Write Clear Messages**: Descriptive commit messages
3. **Pull Before Push**: Always pull latest changes first
4. **Review Before Commit**: Check `git diff` before committing
5. **Don't Commit Secrets**: Use `.gitignore` for sensitive files
6. **Keep History Clean**: Use rebase for clean history (when appropriate)

### .gitignore Essentials

```gitignore
# Xcode
*.xcodeproj/*
!*.xcodeproj/project.pbxproj
!*.xcodeproj/xcshareddata/
!*.xcworkspace/contents.xcworkspacedata
/*.gcno
*.moved-aside
DerivedData/
*.hmap
*.ipa
*.xcuserstate
*.xcscmblueprint

# CocoaPods
Pods/

# Swift Package Manager
.build/
.swiftpm/

# Secrets
*.env
secrets.plist
GoogleService-Info.plist

# OS Files
.DS_Store
```

---

## AI Assistant Guidelines

### Core Principles

1. **Read Before Writing**: Always read existing code before making changes
2. **Maintain Consistency**: Follow existing patterns and conventions
3. **Test Changes**: Ensure code compiles and tests pass
4. **Document Decisions**: Explain architectural choices
5. **Ask When Uncertain**: Clarify requirements before implementation

### When Writing Code

- ✅ Follow Swift naming conventions
- ✅ Add appropriate comments for complex logic
- ✅ Handle errors gracefully
- ✅ Consider edge cases
- ✅ Write testable code
- ✅ Use type safety
- ❌ Don't force unwrap optionals unnecessarily
- ❌ Don't ignore compiler warnings
- ❌ Don't commit commented-out code
- ❌ Don't hardcode sensitive data

### Code Review Checklist

Before committing changes, verify:

- [ ] Code compiles without errors
- [ ] No compiler warnings introduced
- [ ] Tests pass (if applicable)
- [ ] Follows project conventions
- [ ] No sensitive data exposed
- [ ] Documentation updated (if needed)
- [ ] No debug print statements left
- [ ] Memory leaks checked (retain cycles)

### File Operations

When creating new files:

1. **Check if file exists**: Use Read tool first
2. **Follow naming conventions**: Match project structure
3. **Add file headers**: Include copyright/license if used
4. **Update project**: Files may need to be added to Xcode project

### Common Pitfalls to Avoid

1. **Retain Cycles**: Use `[weak self]` or `[unowned self]` in closures
2. **Force Unwrapping**: Prefer optional binding
3. **Stringly-Typed Code**: Use enums instead of strings
4. **Massive View Controllers**: Extract logic to view models/services
5. **Ignoring Memory Management**: Profile and test for leaks
6. **Hardcoded Values**: Use constants or configuration files

---

## Common Tasks

### Adding a New Feature

1. Create feature branch
2. Design the feature (models, views, controllers)
3. Implement models
4. Create UI components
5. Implement business logic
6. Add tests
7. Test on simulator/device
8. Commit and push
9. Create pull request

### Fixing a Bug

1. Reproduce the bug
2. Create bugfix branch
3. Write failing test (if possible)
4. Fix the bug
5. Ensure test passes
6. Test edge cases
7. Commit with clear description
8. Create pull request

### Adding Dependencies

**CocoaPods:**
```bash
# Edit Podfile
pod 'Alamofire', '~> 5.6'

# Install
pod install

# Always use .xcworkspace after this
```

**Swift Package Manager:**
```
File → Add Packages → Enter package URL
```

### Running Tests

```bash
# Command line
xcodebuild test -scheme SIPAIOS -destination 'platform=iOS Simulator,name=iPhone 14'

# Or use Xcode: Cmd + U
```

### Building for Release

1. Update version and build number
2. Update changelog
3. Test on physical devices
4. Archive build (Product → Archive)
5. Validate and submit to App Store Connect

---

## Resources

### Documentation

- [Swift Documentation](https://swift.org/documentation/)
- [Apple Developer Documentation](https://developer.apple.com/documentation/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

### Style Guides

- [Swift API Design Guidelines](https://swift.org/documentation/api-design-guidelines/)
- [Ray Wenderlich Swift Style Guide](https://github.com/raywenderlich/swift-style-guide)
- [Google Swift Style Guide](https://google.github.io/swift/)

### Tools

- **Xcode**: Primary development IDE
- **Instruments**: Performance profiling
- **SwiftLint**: Code style enforcement
- **Fastlane**: Automation tool for deployment

### Learning Resources

- [Swift.org](https://swift.org)
- [Apple Developer Forums](https://developer.apple.com/forums/)
- [iOS Dev Weekly](https://iosdevweekly.com/)
- [Hacking with Swift](https://www.hackingwithswift.com/)

---

## Maintenance

This document should be updated when:

- Project structure changes significantly
- New architectural patterns are adopted
- Development workflows evolve
- New conventions are established
- Major dependencies are added/removed

**Maintainers**: Update the "Last Updated" date at the top when making changes.

---

## Questions?

For AI assistants encountering unclear situations:

1. Check this document first
2. Examine existing code patterns
3. Look for similar implementations in the codebase
4. Ask the developer for clarification
5. Document the decision made

---

*This is a living document. As the SIPAIOS project evolves, this guide should be updated to reflect the current state of the codebase and best practices.*
