const fs = require('fs');
const crypto = require('crypto');

// Key management system
class KeyManager {
  constructor() {
    this.keysFile = 'access-keys.json';
    this.keys = this.loadKeys();
  }

  // Load existing keys from file
  loadKeys() {
    try {
      if (fs.existsSync(this.keysFile)) {
        const data = fs.readFileSync(this.keysFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading keys:', error);
    }
    return {};
  }

  // Save keys to file
  saveKeys() {
    try {
      fs.writeFileSync(this.keysFile, JSON.stringify(this.keys, null, 2));
      console.log('✅ Keys saved successfully');
    } catch (error) {
      console.error('Error saving keys:', error);
    }
  }

  // Generate a new access key
  generateKey(clientName, description = '') {
    const key = crypto.randomBytes(16).toString('hex');
    const timestamp = new Date().toISOString();
    
    this.keys[key] = {
      clientName,
      description,
      createdAt: timestamp,
      isActive: true,
      usageCount: 0,
      lastUsed: null
    };
    
    this.saveKeys();
    return key;
  }

  // Validate a key
  validateKey(key) {
    // Reload keys from file to get latest changes
    this.keys = this.loadKeys();
    return this.keys[key] && this.keys[key].isActive;
  }

  // Get key info
  getKeyInfo(key) {
    // Reload keys from file to get latest changes
    this.keys = this.loadKeys();
    return this.keys[key] || null;
  }

  // Update key usage
  updateKeyUsage(key) {
    if (this.keys[key]) {
      this.keys[key].usageCount++;
      this.keys[key].lastUsed = new Date().toISOString();
      this.saveKeys();
    }
  }

  // Deactivate a key
  deactivateKey(key) {
    if (this.keys[key]) {
      this.keys[key].isActive = false;
      this.saveKeys();
      return true;
    }
    return false;
  }

  // Reactivate a key
  reactivateKey(key) {
    if (this.keys[key]) {
      this.keys[key].isActive = true;
      this.saveKeys();
      return true;
    }
    return false;
  }

  // Delete a key
  deleteKey(key) {
    if (this.keys[key]) {
      delete this.keys[key];
      this.saveKeys();
      return true;
    }
    return false;
  }

  // List all keys
  listKeys() {
    // Reload keys from file to get latest changes
    this.keys = this.loadKeys();
    return Object.entries(this.keys).map(([key, info]) => ({
      key: key.substring(0, 8) + '...', // Show only first 8 chars for security
      fullKey: key,
      ...info
    }));
  }

  // Get active keys count
  getActiveKeysCount() {
    // Reload keys from file to get latest changes
    this.keys = this.loadKeys();
    return Object.values(this.keys).filter(key => key.isActive).length;
  }

  // Get total keys count
  getTotalKeysCount() {
    // Reload keys from file to get latest changes
    this.keys = this.loadKeys();
    return Object.keys(this.keys).length;
  }
}

// CLI interface for key management
function showHelp() {
  console.log(`
🔑 *Access Key Management System*

Usage: node key-manager.js [command] [options]

Commands:
  generate <clientName> [description]  - Generate new key for client
  list                                 - List all keys
  info <key>                          - Show key information
  deactivate <key>                    - Deactivate a key
  reactivate <key>                    - Reactivate a key
  delete <key>                        - Delete a key
  stats                               - Show key statistics
  help                                - Show this help

Examples:
  node key-manager.js generate "John Doe" "Premium client"
  node key-manager.js list
  node key-manager.js info abc123def456
  node key-manager.js deactivate abc123def456
  `);
}

// Main CLI function
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const keyManager = new KeyManager();

  switch (command) {
    case 'generate':
      const clientName = args[1];
      const description = args[2] || '';
      
      if (!clientName) {
        console.log('❌ Error: Client name is required');
        console.log('Usage: node key-manager.js generate <clientName> [description]');
        return;
      }
      
      const newKey = keyManager.generateKey(clientName, description);
      console.log(`
✅ *New Access Key Generated*

*Client:* ${clientName}
*Description:* ${description}
*Key:* ${newKey}
*Status:* Active

*Instructions for client:*
1. Send this key to your client
2. Client uses: /auth ${newKey}
3. Key is automatically saved and tracked
      `);
      break;

    case 'list':
      const keys = keyManager.listKeys();
      console.log(`
📋 *Access Keys List*

Total Keys: ${keyManager.getTotalKeysCount()}
Active Keys: ${keyManager.getActiveKeysCount()}

${keys.map(key => `
🔑 *${key.clientName}*
Key: ${key.key}
Status: ${key.isActive ? '✅ Active' : '❌ Inactive'}
Usage: ${key.usageCount} times
Created: ${new Date(key.createdAt).toLocaleDateString()}
Last Used: ${key.lastUsed ? new Date(key.lastUsed).toLocaleDateString() : 'Never'}
Description: ${key.description}
`).join('')}
      `);
      break;

    case 'info':
      const keyToCheck = args[1];
      if (!keyToCheck) {
        console.log('❌ Error: Key is required');
        console.log('Usage: node key-manager.js info <key>');
        return;
      }
      
      const keyInfo = keyManager.getKeyInfo(keyToCheck);
      if (keyInfo) {
        console.log(`
🔍 *Key Information*

*Client:* ${keyInfo.clientName}
*Description:* ${keyInfo.description}
*Status:* ${keyInfo.isActive ? '✅ Active' : '❌ Inactive'}
*Usage Count:* ${keyInfo.usageCount} times
*Created:* ${new Date(keyInfo.createdAt).toLocaleString()}
*Last Used:* ${keyInfo.lastUsed ? new Date(keyInfo.lastUsed).toLocaleString() : 'Never'}
        `);
      } else {
        console.log('❌ Key not found');
      }
      break;

    case 'deactivate':
      const keyToDeactivate = args[1];
      if (!keyToDeactivate) {
        console.log('❌ Error: Key is required');
        console.log('Usage: node key-manager.js deactivate <key>');
        return;
      }
      
      if (keyManager.deactivateKey(keyToDeactivate)) {
        console.log('✅ Key deactivated successfully');
      } else {
        console.log('❌ Key not found');
      }
      break;

    case 'reactivate':
      const keyToReactivate = args[1];
      if (!keyToReactivate) {
        console.log('❌ Error: Key is required');
        console.log('Usage: node key-manager.js reactivate <key>');
        return;
      }
      
      if (keyManager.reactivateKey(keyToReactivate)) {
        console.log('✅ Key reactivated successfully');
      } else {
        console.log('❌ Key not found');
      }
      break;

    case 'delete':
      const keyToDelete = args[1];
      if (!keyToDelete) {
        console.log('❌ Error: Key is required');
        console.log('Usage: node key-manager.js delete <key>');
        return;
      }
      
      if (keyManager.deleteKey(keyToDelete)) {
        console.log('✅ Key deleted successfully');
      } else {
        console.log('❌ Key not found');
      }
      break;

    case 'stats':
      console.log(`
📊 *Key Statistics*

Total Keys: ${keyManager.getTotalKeysCount()}
Active Keys: ${keyManager.getActiveKeysCount()}
Inactive Keys: ${keyManager.getTotalKeysCount() - keyManager.getActiveKeysCount()}

*Usage Summary:*
${keyManager.listKeys().map(key => `${key.clientName}: ${key.usageCount} times`).join('\n')}
      `);
      break;

    case 'help':
    default:
      showHelp();
      break;
  }
}

// Export for use in other files
module.exports = KeyManager;

// Run CLI if this file is executed directly
if (require.main === module) {
  main();
} 