import chalk from "chalk";

function highlightJson(jsonData) {
  const jsonString = JSON.stringify(jsonData, null, 2);
  return syntaxHighlight(jsonString);
}

// Utility function to add syntax highlighting
function syntaxHighlight(jsonString) {
  return jsonString.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(\.\d*)?(e[+-]?\d+)?|\[|\]|\{|\}|,|\\n|\\r|\\t|\\\/|\\b|\\f|\\\\|\/\/.*|\/\*[^*]*\*\/)/g,
    (match) => {
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          return chalk.yellow(match); // Key
        } else {
          const escapedString = match.replace(/\\./g, (char) => {
            return chalk.cyan(char); // Highlight escaped characters in strings
          });
          return chalk.green(escapedString); // String
        }
      } else if (/true|false/.test(match)) {
        return chalk.blue(match); // Boolean
      } else if (/null/.test(match)) {
        return chalk.gray(match); // Null
      } else if (/^\[|\]$/.test(match)) {
        return chalk.white(match); // Square brackets
      } else if (/^\{|\}$/.test(match)) {
        return chalk.white(match); // Curly braces
      } else if (/^\,/.test(match)) {
        return chalk.white(match); // Comma
      } else if (/^\\n|\\r|\\t/.test(match)) {
        return chalk.cyan(match); // Escaped characters
      } else if (/^\\\/|\\b|\\f|\\\\/.test(match)) {
        return chalk.cyan(match); // More escaped characters
      } else if (/\/\/.*/.test(match)) {
        return chalk.gray(match); // Single-line comments
      } else if (/\/\*[^*]*\*\//.test(match)) {
        return chalk.gray(match); // Multi-line comments
      } else if (/[-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?/.test(match)) {
        return chalk.red(match); // Number
      } else {
        return match; // Default (should not happen)
      }
    },
  );
}

export { syntaxHighlight };
