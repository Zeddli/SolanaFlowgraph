import * as XLSX from 'xlsx';
import { Graph, Node, Link } from './dataProcessor';

// Function to read Excel file and convert to graph format
export async function readExcelData(): Promise<Graph> {
  try {
    // In a browser environment, we'd use fetch to get the file
    // For simplicity in this example, we'll return simulated data
    // In a real implementation, this would use the file system or fetch API
    
    // Simulate Excel data structure (based on typical Solana transaction data)
    // This would normally come from parsing the Excel file
    const excelData = [
      { sender: 'Wallet1', receiver: 'Program1', amount: 10.5, timestamp: '2023-01-01', type: 'Transfer' },
      { sender: 'Wallet1', receiver: 'Wallet2', amount: 5.2, timestamp: '2023-01-02', type: 'Transfer' },
      { sender: 'Wallet2', receiver: 'Program2', amount: 3.1, timestamp: '2023-01-03', type: 'Swap' },
      { sender: 'Program2', receiver: 'Wallet3', amount: 2.8, timestamp: '2023-01-03', type: 'Swap' },
      { sender: 'Wallet3', receiver: 'Wallet4', amount: 1.5, timestamp: '2023-01-04', type: 'Transfer' },
      { sender: 'Wallet4', receiver: 'Program3', amount: 7.2, timestamp: '2023-01-05', type: 'Stake' },
      { sender: 'Program1', receiver: 'Wallet5', amount: 4.3, timestamp: '2023-01-06', type: 'Reward' },
      { sender: 'Wallet5', receiver: 'Program3', amount: 2.1, timestamp: '2023-01-07', type: 'Stake' },
    ];
    
    // Process the data into nodes and links
    return processExcelData(excelData);
  } catch (error) {
    console.error('Error reading Excel file:', error);
    throw error;
  }
}

// Process the Excel data into a graph structure
function processExcelData(data: any[]): Graph {
  // Maps to keep track of unique nodes
  const nodesMap = new Map<string, Node>();
  const links: Link[] = [];
  
  // Process each row of data
  data.forEach((row, index) => {
    const { sender, receiver, amount, type } = row;
    
    // Add sender node if not already in the map
    if (!nodesMap.has(sender)) {
      nodesMap.set(sender, {
        id: sender,
        group: sender.startsWith('Program') ? 2 : 1, // Programs are group 2, wallets are group 1
        label: sender,
        value: 80, // Default size
      });
    }
    
    // Add receiver node if not already in the map
    if (!nodesMap.has(receiver)) {
      nodesMap.set(receiver, {
        id: receiver,
        group: receiver.startsWith('Program') ? 2 : 1,
        label: receiver,
        value: 80,
      });
    }
    
    // Add link between sender and receiver
    links.push({
      source: sender,
      target: receiver,
      value: amount * 5, // Scale amount for visualization
    });
    
    // Update node values based on transaction activity
    const senderNode = nodesMap.get(sender)!;
    const receiverNode = nodesMap.get(receiver)!;
    
    // Make more active nodes slightly larger
    senderNode.value += 5;
    receiverNode.value += 5;
    
    // Adjust node groups based on transaction type
    if (type === 'Swap') {
      // Mark swap-related nodes as group 3 (different color)
      nodesMap.set(sender, { ...senderNode, group: 3 });
      nodesMap.set(receiver, { ...receiverNode, group: 3 });
    } else if (type === 'Stake') {
      // Mark staking-related program nodes as group 4
      if (receiver.startsWith('Program')) {
        nodesMap.set(receiver, { ...receiverNode, group: 4 });
      }
    }
  });
  
  return {
    nodes: Array.from(nodesMap.values()),
    links,
  };
}

// This function would handle actually reading the XLSX file in a Node.js environment
export async function readExcelFile(filePath: string): Promise<any[]> {
  try {
    // In a Node.js environment, we would use the fs module
    // For this example, we'll just return the mock data
    return [
      { sender: 'Wallet1', receiver: 'Program1', amount: 10.5, timestamp: '2023-01-01', type: 'Transfer' },
      { sender: 'Wallet1', receiver: 'Wallet2', amount: 5.2, timestamp: '2023-01-02', type: 'Transfer' },
      // ...more rows
    ];
    
    // Real implementation would look like:
    // const workbook = XLSX.readFile(filePath);
    // const sheetName = workbook.SheetNames[0];
    // const worksheet = workbook.Sheets[sheetName];
    // return XLSX.utils.sheet_to_json(worksheet);
  } catch (error) {
    console.error('Error reading Excel file:', error);
    throw error;
  }
} 