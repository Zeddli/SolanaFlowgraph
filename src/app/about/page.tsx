import Header from '../components/Header';

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">About SolanaFlowGraph</h1>
          
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Our Mission</h2>
            <p className="text-gray-700 mb-4">
              SolanaFlowGraph is dedicated to making Solana blockchain data more accessible and understandable through 
              powerful visualizations. Our platform enables users to explore transaction flows, analyze program interactions, 
              and gain insights into on-chain activity in real-time.
            </p>
            <p className="text-gray-700">
              Whether you're a developer trying to debug a program, an analyst looking for patterns, or just a curious
              blockchain enthusiast, our tools help you see the relationships and connections that drive the Solana ecosystem.
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Features</h2>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Real-time transaction visualization</li>
              <li>Live data fetching from Solscan.io</li>
              <li>Real-time block and validator monitoring</li>
              <li>Detailed transaction statistics</li>
              <li>Interactive graph visualization tools</li>
              <li>Token and program analysis</li>
            </ul>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Data Sources</h2>
            <p className="text-gray-700 mb-4">
              SolanaFlowGraph integrates with Solscan.io to provide up-to-date information about:
            </p>
            <ul className="list-disc pl-6 text-gray-700 space-y-2">
              <li>Live transactions</li>
              <li>Block details and production</li>
              <li>Validator performance and statistics</li>
              <li>Token metrics and transfers</li>
            </ul>
            <p className="text-gray-700 mt-4">
              Our integration with Solscan ensures you always have access to the most current data on the Solana blockchain.
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Technology Stack</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {['Next.js', 'TypeScript', 'Tailwind CSS', 'React', 'Solana Web3.js', 'D3.js'].map((tech) => (
                <div key={tech} className="bg-gray-50 rounded p-3 text-center">
                  <span className="font-medium">{tech}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Contact Us</h2>
            <p className="text-gray-700 mb-4">
              We're always looking to improve SolanaFlowGraph. If you have any suggestions, questions, or just want to
              say hello, please reach out to us.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a 
                href="https://github.com/Zeddli/solana-flowgraph"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gray-800 hover:bg-gray-700"
              >
                GitHub
              </a>
              <a 
                href="mailto:contact@solanaflowgraph.io"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90"
              >
                Email Us
              </a>
              <a 
                href="https://twitter.com/solanaflowgraph"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-400 hover:bg-blue-500"
              >
                Twitter
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 