#!/bin/bash

npm exec vsce package

# Find the latest .vsix file based on the file name
LATEST_VSIX_FILE=$(ls -t *.vsix 2>/dev/null | head -1)

# Check if a .vsix file was found
if [ -z "$LATEST_VSIX_FILE" ]; then
  echo "Error: No .vsix files found in $VSIX_FOLDER"
  exit 1
fi

# Install the latest extension using the 'code' command-line tool
code --install-extension "$LATEST_VSIX_FILE"

# Check the exit code to determine if the installation was successful
if [ $? -eq 0 ]; then
  echo "Latest extension version installed successfully: $LATEST_VSIX_FILE"
else
  echo "Error: Extension installation failed"
  exit 1
fi

# Prompt the user to restart Visual Studio Code
read -p "Do you want to restart Visual Studio Code? (y/n): " choice
if [ "$choice" = "y" ] || [ "$choice" = "Y" ]; then
  # Check if Visual Studio Code is already running
  if pgrep -x "code" > /dev/null; then
      # Send a signal to reload VSCode
      pkill -USR1 code
      echo "Visual Studio Code reloaded."
      code .
  else
      echo "Visual Studio Code is not running."
  fi
else
  echo "Script exiting without restarting Visual Studio Code."
fi

exit 0