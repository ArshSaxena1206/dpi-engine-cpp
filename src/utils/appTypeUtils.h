#pragma once

#include <string>
#include "types.h"

namespace DPI {

/**
 * @brief Converts an AppType enum value to its corresponding string representation.
 * 
 * 1. What it does:
 *    Maps internal AppType enumerations to human-readable strings used for reporting and logging.
 * 
 * 2. Which modules depend on it:
 *    - Community 0: Server/Job generation logic (via stdout parsing)
 *    - Community 1: Core DPI Engine reporting (generateReport, etc.)
 *    - Community 2: Blocking Rules (matching app strings to AppTypes)
 *    - Community 3: Flow tracking and connection management
 * 
 * 3. What breaks if it changes:
 *    - The Node.js backend regex parsing will fail to parse engine output if string formats change.
 *    - Users passing command-line args (e.g. `--block-app YouTube`) will fail to match if casing/spelling changes.
 * 
 * 4. Known edge cases:
 *    - Ensure any new AppType added to the enum also gets a string mapping here.
 *    - "Twitter/X" string might break simple alphabetic string matchers if not careful.
 * 
 * @param type The AppType enumeration value.
 * @return std::string The string representation of the application type.
 */
std::string appTypeToString(AppType type);

} // namespace DPI
