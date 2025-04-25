'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { processMockData, processTransactions, processSolscanTransactions, Graph, Node, Link } from '@/lib/dataProcessor';
import { readExcelData } from '@/lib/excelReader';
import { Client } from '@solana-tracker/data-api';

interface FilterSettings {
  minValue: number;
  maxValue: number;
  nodeTypes: {
    wallet: boolean;
    program: boolean;
    protocol: boolean;
    swap: boolean;
  };
}

interface GraphVisualizationProps {
  dataSource: 'mockData' | 'excelData' | 'solanaData';
  filters?: FilterSettings;
}

export default function GraphVisualization({ 
  dataSource, 
  filters = {
    minValue: 0,
    maxValue: 1000,
    nodeTypes: {
      wallet: true,
      program: true,
      protocol: true,
      swap: true
    }
  } 
}: GraphVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [graphData, setGraphData] = useState<Graph>(processMockData());
  const [filteredData, setFilteredData] = useState<Graph>(graphData);
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [apiKey, setApiKey] = useState(process.env.NEXT_PUBLIC_SOLANA_TRACKER_API_KEY || '');
  const [visualizationMode, setVisualizationMode] = useState<'mockData' | 'solanaData'>('mockData');
  const [error, setError] = useState<string | null>(null);

  // Effect to load data based on dataSource
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        switch (dataSource) {
          case 'mockData':
            setGraphData(processMockData());
            break;
          case 'excelData':
            const excelData = await readExcelData();
            setGraphData(excelData);
            break;
          case 'solanaData':
            // Default to mock data if no wallet address
            if (!walletAddress) {
              setWalletAddress('Enter a wallet address');
              setLoading(false);
              return;
            } 
            
            if (apiKey) {
              try {
                console.log("Loading wallet data with Solana Tracker API...");
                const trackerData = await processWalletWithSolanaTracker(walletAddress, apiKey);
                setGraphData(trackerData);
              } catch (error) {
                console.error("Failed to load data with Solana Tracker:", error);
                
                // Handle specific error types with appropriate messages
                if (error instanceof Error) {
                  const errorString = error.toString();
                  
                  if (errorString.includes('401') || errorString.includes('Unauthorized')) {
                    setError('Authentication failed. Please check your API key.');
                    alert(
                      'API Authentication Error (401 Unauthorized)\n\n' +
                      'Your API key was rejected by the Solana Tracker service.\n\n' +
                      'Please check that:\n' +
                      '• Your API key is correct\n' +
                      '• Your API key has not expired\n' +
                      '• You have the correct permissions for this API\n\n' +
                      'Falling back to Solscan API...'
                    );
                  } else if (errorString.includes('429') || errorString.includes('Rate limit')) {
                    setError('Rate limit exceeded. Please try again later.');
                    alert(
                      'API Rate Limit Error (429 Too Many Requests)\n\n' +
                      'You have exceeded the rate limit for the Solana Tracker API.\n\n' +
                      'Falling back to Solscan API...'
                    );
                  } else if (errorString.includes('403') || errorString.includes('Forbidden')) {
                    setError('Access forbidden. Your API key may not have sufficient permissions.');
                    alert(
                      'API Permission Error (403 Forbidden)\n\n' +
                      'Your API key does not have sufficient permissions to access this resource.\n\n' +
                      'Falling back to Solscan API...'
                    );
                  } else {
                    setError(`API Error: ${error.message}`);
                    alert(
                      'API Error\n\n' +
                      `${error.message}\n\n` +
                      'Falling back to Solscan API...'
                    );
                  }
                }
                
                // Try Solscan as fallback
                console.log("Falling back to Solscan API...");
                try {
                  await loadWalletData();
                } catch (solscanError) {
                  console.error("Solscan fallback also failed:", solscanError);
                  // Final fallback to mock data
                  setError('All data sources failed. Showing mock data.');
                  setGraphData(processMockData());
                  alert(
                    'Data Source Error\n\n' +
                    'All available data sources failed to load wallet data.\n\n' +
                    'Showing mock data for demonstration purposes.'
                  );
                }
              }
            } else {
              // If no API key, use Solscan directly
              try {
                await loadWalletData();
              } catch (error) {
                console.error("Solscan API failed:", error);
                setError('Failed to load data from Solscan. Showing mock data.');
                setGraphData(processMockData());
                alert(
                  'Solscan API Error\n\n' +
                  'Failed to load data from Solscan.\n\n' +
                  'Showing mock data for demonstration purposes.'
                );
              }
            }
            break;
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setError(`Failed to load data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Final fallback to mock data if everything else fails
        setGraphData(processMockData());
        alert(
          'Data Loading Error\n\n' +
          'An unexpected error occurred while loading data.\n\n' +
          'Showing mock data for demonstration purposes.'
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [dataSource, walletAddress, apiKey]);

  // Apply filters to data
  useEffect(() => {
    if (!graphData.nodes.length) return;

    // Filter nodes based on value range and node type
    const filteredNodes = graphData.nodes.filter(node => {
      // Check node value range
      if (node.value < filters.minValue || node.value > filters.maxValue) {
        return false;
      }

      // Check node type
      if (node.group === 1 && !filters.nodeTypes.wallet) return false;
      if (node.group === 2 && !filters.nodeTypes.program) return false;
      if (node.group === 3 && !filters.nodeTypes.protocol) return false;
      if (node.group === 4 && !filters.nodeTypes.swap) return false;

      return true;
    });

    // Get the IDs of filtered nodes
    const filteredNodeIds = new Set(filteredNodes.map(node => node.id));

    // Filter links that connect to filtered nodes on both ends
    const filteredLinks = graphData.links.filter(link => {
      // Handle both string and object references for source and target
      const sourceId = typeof link.source === 'string' 
        ? link.source 
        : (link.source as any)?.id || '';
      
      const targetId = typeof link.target === 'string' 
        ? link.target 
        : (link.target as any)?.id || '';
      
      return filteredNodeIds.has(sourceId) && filteredNodeIds.has(targetId);
    });

    setFilteredData({ nodes: filteredNodes, links: filteredLinks });
  }, [graphData, filters]);

  // Function to load data from a Solana wallet using Solscan
  const loadWalletData = async () => {
    if (!walletAddress) return;
    
    setLoading(true);
    try {
      // Will fall back to mock data if Solscan API fails
      const data = await processSolscanTransactions(walletAddress);
      
      if (data.nodes.length > 0) {
        setGraphData(data);
        
        // Check if data is from Solscan or mock data
        const isMockData = data.nodes.some(node => node.id.startsWith('MockWallet'));
        
        if (isMockData) {
          // Just log the message without showing an alert
          console.log("Using mock data for visualization since Solscan API failed");
        } else {
          console.log("Successfully loaded wallet data from Solscan:", data);
        }
      } else {
        const solscanUrl = `https://solscan.io/account/${walletAddress}`;
        alert(`No transactions found for this wallet on Solscan. \n\nTry viewing this wallet directly on Solscan: ${solscanUrl}`);
      }
    } catch (error) {
      console.error('Error loading wallet data from Solscan:', error);
      let errorMessage = 'Error loading wallet data from Solscan.';
      
      if (error instanceof Error) {
        errorMessage += ' ' + error.message;
      }
      
      // If it's an API error, suggest visiting the website directly
      const solscanUrl = `https://solscan.io/account/${walletAddress}`;
      errorMessage += `\n\nTry viewing this wallet directly on Solscan: ${solscanUrl}`;
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Utility function to generate Solscan URL based on entity type
  const getSolscanUrl = (id: string, type: number): string => {
    // Determine URL based on node type (group)
    switch (type) {
      case 1: // Wallet
        return `https://solscan.io/account/${id}`;
      case 2: // Program
        return `https://solscan.io/account/${id}`; // Programs are also accounts
      case 3: // Protocol (often represented as transactions)
        return `https://solscan.io/txs/${id}`;
      case 4: // Swap Protocol
        return `https://solscan.io/account/${id}`;
      default:
        return `https://solscan.io/account/${id}`;
    }
  };

  // Function to open entity on Solscan
  const viewOnSolscan = (id?: string, type: number = 1) => {
    const address = id || walletAddress;
    if (!address) return;
    window.open(getSolscanUrl(address, type), '_blank');
  };

  useEffect(() => {
    if (dataSource === 'solanaData' && walletAddress && walletAddress.length > 30) {
      // Only load if the address seems valid (based on length)
      const timer = setTimeout(() => {
        loadWalletData();
      }, 500); // 500ms delay to avoid loading during typing
      return () => clearTimeout(timer);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (!svgRef.current || loading || !filteredData.nodes.length) return;

    // Clear any existing visualization
    d3.select(svgRef.current).selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Create SVG with zoom support
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .call(d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.25, 5])
        .on("zoom", (event) => {
          g.attr("transform", event.transform);
        }) as any);

    // Create a main group that will be transformed for zoom
    const g = svg.append("g");
    
    // Add a background rect to catch zoom events
    g.append("rect")
      .attr("width", width * 3)
      .attr("height", height * 3)
      .attr("x", -width)
      .attr("y", -height)
      .attr("fill", "none")
      .attr("pointer-events", "all");

    // Define forces
    const simulation = d3.forceSimulation(filteredData.nodes as d3.SimulationNodeDatum[])
      .force("link", d3.forceLink(filteredData.links)
        .id((d: any) => d.id)
        .distance(100))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("x", d3.forceX(width / 2).strength(0.1))
      .force("y", d3.forceY(height / 2).strength(0.1));

    // Create a group for links
    const links = g.append("g")
      .selectAll("line")
      .data(filteredData.links)
      .enter()
      .append("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", (d: Link) => Math.sqrt(d.value));

    // Create a group for nodes
    const nodesGroup = g.append("g");
    
    const nodes = nodesGroup
      .selectAll("circle")
      .data(filteredData.nodes)
      .enter()
      .append("circle")
      .attr("r", (d: Node) => Math.sqrt(d.value))
      .attr("fill", (d: Node) => {
        const colors = ["#9945FF", "#14F195", "#FF9900", "#FF5733"];
        return colors[d.group % colors.length];
      })
      .call(d3.drag<SVGCircleElement, Node>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended) as any)
      .on("click", (event: MouseEvent, d: Node) => {
        setSelectedNode(d);
        event.stopPropagation();
      });

    // Clear selection when clicking on the background
    svg.on("click", () => setSelectedNode(null));

    // Add labels to nodes
    const labels = nodesGroup
      .selectAll("text")
      .data(filteredData.nodes)
      .enter()
      .append("text")
      .text((d: Node) => d.label)
      .attr("font-size", 10)
      .attr("dx", 15)
      .attr("dy", 4)
      .attr("pointer-events", "none");

    // Add tooltips
    nodes.append("title")
      .text((d: Node) => d.label);

    // Update positions on simulation tick
    simulation.on("tick", () => {
      links
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      nodes
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y);

      labels
        .attr("x", (d: any) => d.x)
        .attr("y", (d: any) => d.y);
    });

    // Drag functions
    function dragstarted(event: d3.D3DragEvent<SVGCircleElement, Node, any>, d: Node & d3.SimulationNodeDatum) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: d3.D3DragEvent<SVGCircleElement, Node, any>, d: Node & d3.SimulationNodeDatum) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGCircleElement, Node, any>, d: Node & d3.SimulationNodeDatum) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [filteredData, loading]);

  // Display node count info
  const renderNodeCount = () => {
    return (
      <div style={{ 
        position: 'absolute', 
        bottom: '20px', 
        left: '20px',
        background: 'white',
        border: '1px solid #eaeaea',
        borderRadius: '8px',
        padding: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        fontSize: '12px',
        zIndex: 1000
      }}>
        <div>Showing {filteredData.nodes.length} nodes of {graphData.nodes.length} total</div>
        <div>With {filteredData.links.length} connections</div>
      </div>
    );
  };

  // Render node details panel if a node is selected
  const renderNodeDetails = () => {
    if (!selectedNode) return null;

    return (
      <div 
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          background: 'white',
          border: '1px solid #eaeaea',
          borderRadius: '8px',
          padding: '15px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          maxWidth: '300px',
          zIndex: 1000
        }}
      >
        <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>
          {selectedNode.label}
        </h3>
        <p style={{ margin: '5px 0', fontSize: '14px' }}>
          <strong>Type:</strong> {selectedNode.group === 1 ? 'Wallet' : selectedNode.group === 2 ? 'Program' : 'Protocol'}
        </p>
        <p style={{ margin: '5px 0', fontSize: '14px' }}>
          <strong>ID:</strong> {selectedNode.id}
        </p>
        <p style={{ margin: '5px 0', fontSize: '14px' }}>
          <strong>Activity Size:</strong> {selectedNode.value}
        </p>
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <button 
            onClick={() => setSelectedNode(null)}
            style={{ 
              padding: '5px 10px',
              fontSize: '12px',
              backgroundColor: '#f5f5f5',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
          <button 
            onClick={() => viewOnSolscan(selectedNode.id, selectedNode.group)}
            style={{ 
              padding: '5px 10px',
              fontSize: '12px',
              backgroundColor: '#4A90E2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            View on Solscan
          </button>
        </div>
      </div>
    );
  };

  // Render legend
  const renderLegend = () => {
    const legendItems = [
      { color: "#9945FF", label: "Wallet" },
      { color: "#14F195", label: "Program" },
      { color: "#FF9900", label: "Protocol" },
      { color: "#FF5733", label: "Swap Protocol" }
    ];

    return (
      <div 
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'white',
          border: '1px solid #eaeaea',
          borderRadius: '8px',
          padding: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          zIndex: 1000
        }}
      >
        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>Legend</div>
        {legendItems.map((item, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', margin: '3px 0' }}>
            <div style={{ 
              width: '12px', 
              height: '12px', 
              backgroundColor: item.color, 
              borderRadius: '50%',
              marginRight: '8px' 
            }}></div>
            <span style={{ fontSize: '12px' }}>{item.label}</span>
          </div>
        ))}
      </div>
    );
  };

  // Render function for the address input section
  const renderAddressInput = () => {
    return (
      <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="Enter Solana wallet address"
            style={{ 
              padding: '8px', 
              borderRadius: '4px', 
              border: '1px solid #ccc',
              flexGrow: 1 
            }}
          />
          <button 
            onClick={() => loadWalletDataWithTracker()}
            disabled={loading || !walletAddress}
            style={{
              padding: '8px 16px',
              backgroundColor: '#9945FF',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading || !walletAddress ? 'not-allowed' : 'pointer',
              opacity: loading || !walletAddress ? 0.7 : 1
            }}
          >
            {loading ? 'Loading...' : 'Visualize'}
          </button>
        </div>
        <div style={{ 
          fontSize: '13px', 
          color: '#666',
          padding: '5px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px'
        }}>
          <p style={{ margin: '0 0 5px 0' }}>This visualization uses the Solana Tracker Data API.</p>
        </div>
      </div>
    );
  };

  // Add new function to load wallet data with Solana Tracker API
  const loadWalletDataWithTracker = async () => {
    if (!walletAddress || !apiKey) return;
    
    setLoading(true);
    try {
      // Validate API key and wallet address before making the request
      if (!apiKey.trim() || apiKey.length < 20) {
        throw new Error('Invalid API key format. API keys should be at least 20 characters long.');
      }
      
      if (!walletAddress.trim() || walletAddress.length < 32) {
        throw new Error('Invalid wallet address format. Please enter a valid Solana wallet address.');
      }
      
      const data = await processWalletWithSolanaTracker(walletAddress, apiKey);
      setGraphData(data);
      console.log("Successfully loaded wallet data from Solana Tracker:", data);
    } catch (error) {
      console.error('Error loading wallet data:', error);
      let errorMessage = 'Error loading wallet data from Solana Tracker.';
      let useMockData = false;
      
      // Enhanced error handling for authentication issues
      if (error instanceof Error) {
        const errorString = error.toString();
        
        if (errorString.includes('401') || errorString.includes('Unauthorized')) {
          errorMessage = 'Authentication failed with Solana Tracker API. Please check your API key is valid and correctly entered.';
          useMockData = true;
          
          // Show a more detailed error modal
          alert(
            'API Authentication Error (401 Unauthorized)\n\n' +
            'Your API key was rejected by the Solana Tracker service.\n\n' +
            'Please check that:\n' +
            '• Your API key is correct\n' +
            '• Your API key has not expired\n' +
            '• You have the correct permissions for this API\n\n' +
            'The visualization will fall back to Solscan API. If Solscan also fails, mock data will be used for demonstration purposes.'
          );
        } else if (errorString.includes('429') || errorString.includes('Rate limit')) {
          errorMessage = 'Rate limit exceeded. Please try again later.';
          useMockData = true;
          
          alert(
            'API Rate Limit Error (429 Too Many Requests)\n\n' +
            'You have exceeded the rate limit for the Solana Tracker API.\n\n' +
            'Please wait a moment before trying again, or consider:\n' +
            '• Reducing the frequency of your requests\n' +
            '• Upgrading to a higher tier API plan if available\n\n' +
            'The visualization will fall back to Solscan API. If Solscan also fails, mock data will be used for demonstration purposes.'
          );
        } else if (errorString.includes('403') || errorString.includes('Forbidden')) {
          errorMessage = 'Access forbidden. Your API key may not have sufficient permissions.';
          useMockData = true;
          
          alert(
            'API Permission Error (403 Forbidden)\n\n' +
            'Your API key does not have sufficient permissions to access this resource.\n\n' +
            'Please check that:\n' +
            '• Your account has the necessary subscription level\n' +
            '• Your API key has the required scopes\n' +
            '• You are not requesting restricted data\n\n' +
            'The visualization will fall back to Solscan API. If Solscan also fails, mock data will be used for demonstration purposes.'
          );
        } else {
          errorMessage += ' ' + error.message;
          
          // Generic error message for other issues
          alert(
            'Error Processing Wallet Data\n\n' +
            `${error.message}\n\n` +
            'Please check your wallet address and try again later.\n' +
            'The visualization will fall back to Solscan API. If Solscan also fails, mock data will be used for demonstration purposes.'
          );
          useMockData = true;
        }
      }
      
      console.error(errorMessage);
      setError(errorMessage);
      
      // Try Solscan as a fallback if API auth fails or any other error occurs
      if (useMockData) {
        console.log("Falling back to Solscan API...");
        try {
          await loadWalletData();
        } catch (solscanError) {
          console.error("Solscan fallback also failed:", solscanError);
          // Final fallback to mock data if Solscan also fails
          console.log("Falling back to mock data due to API issues");
          setGraphData(processMockData());
          setError('All data sources failed. Showing mock data for demonstration purposes.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {dataSource === 'solanaData' && renderAddressInput()}
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          Loading data...
        </div>
      ) : (
        <>
          <svg ref={svgRef} style={{ 
            width: '100%', 
            height: dataSource === 'solanaData' ? 'calc(100% - 60px)' : '100%' 
          }}></svg>
          {renderLegend()}
          {renderNodeDetails()}
          {renderNodeCount()}
        </>
      )}
    </div>
  );
}

// Create a function to use the Solana Tracker API
export async function processWalletWithSolanaTracker(
  walletAddress: string,
  apiKey: string
): Promise<Graph> {
  try {
    // Validate API key format
    if (!apiKey || apiKey.trim().length < 20) {
      throw new Error('Invalid API key format. Please provide a valid Solana Tracker API key.');
    }
    
    // Validate wallet address
    if (!walletAddress || walletAddress.trim().length < 32) {
      throw new Error('Invalid wallet address format. Please provide a valid Solana wallet address.');
    }
    
    // Initialize client with API key
    const client = new Client({
      apiKey: apiKey,
    });
    
    try {
      // Fetch wallet information
      const walletInfo = await client.getWallet(walletAddress);
      
      // Fetch wallet trades if wallet info is successful
      const walletTrades = await client.getWalletTrades(walletAddress);
      
      // Check if we have valid data before proceeding
      if (!walletInfo || !walletTrades) {
        throw new Error('Received empty response from Solana Tracker API.');
      }
      
      // Create graph structure from the data
      const nodes: Node[] = [];
      const links: Link[] = [];
      
      // Add main wallet node
      nodes.push({
        id: walletAddress,
        group: 1,
        label: `Wallet ${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`,
        value: 100,
      });
      
      // Process token holdings
      if (walletInfo.tokens) {
        walletInfo.tokens.forEach((token: any) => {
          const tokenId = token.mint || token.tokenAddress || `token-${Math.random().toString(36).substring(2, 9)}`;
          const tokenLabel = token.symbol || token.name || tokenId.slice(0, 6);
          
          // Add token node
          nodes.push({
            id: tokenId,
            group: 3, // Token group
            label: `Token: ${tokenLabel}`,
            value: Math.min(150, Math.max(30, token.usdValue || 50)),
          });
          
          // Add link between wallet and token
          links.push({
            source: walletAddress,
            target: tokenId,
            value: 8,
          });
        });
      }
      
      // Process trades to extract programs
      if (walletTrades.trades) {
        const programs = new Set<string>();
        
        walletTrades.trades.forEach((trade: any) => {
          if (trade.program && !programs.has(trade.program)) {
            programs.add(trade.program);
            
            const programName = trade.programName || `${trade.program.slice(0, 6)}...${trade.program.slice(-4)}`;
            
            // Add program node
            nodes.push({
              id: trade.program,
              group: 2, // Program group
              label: `Program: ${programName}`,
              value: 120,
            });
            
            // Add link between wallet and program
            links.push({
              source: walletAddress,
              target: trade.program,
              value: 10,
            });
          }
        });
      }
      
      return { nodes, links };
    } catch (error: any) {
      // Improve error detection and messaging
      if (error.response) {
        const status = error.response.status;
        
        if (status === 401) {
          throw new Error('Authentication failed (401): Invalid API key or unauthorized access. Please check your Solana Tracker API key.');
        } else if (status === 403) {
          throw new Error('Access forbidden (403): Your API key does not have permission to access this resource.');
        } else if (status === 429) {
          throw new Error('Rate limit exceeded (429): You have made too many requests. Please try again later.');
        } else if (status === 404) {
          throw new Error(`Wallet not found (404): The address ${walletAddress} could not be found or has no data.`);
        } else {
          throw new Error(`API error (${status}): ${error.message || 'Unknown error'}`);
        }
      } else if (error.request) {
        // Request was made but no response received (network error)
        throw new Error(`Network error: Unable to connect to Solana Tracker API. Please check your internet connection and try again.`);
      } else {
        // Something else happened during request setup
        throw error;
      }
    }
  } catch (error) {
    console.error('Error fetching wallet data from Solana Tracker:', error);
    throw error;
  }
} 