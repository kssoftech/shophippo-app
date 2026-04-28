import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }) => {
  // Simple action for any form submissions
  return { success: true };
};

export default function IndexPage() {
  return (
    <s-page heading="ShopHippo - Product Sync Dashboard">
      <s-section heading="Welcome to ShopHippo">
        <s-paragraph>
          <strong>ShopHippo</strong> is a Shopify app that synchronizes your product inventory with your Sales Rep Dashboard in real-time.
        </s-paragraph>
      </s-section>

      <s-section heading="How It Works">
        <s-paragraph>
          <strong>🔄 Sync Process:</strong>
        </s-paragraph>
        <s-unordered-list>
          <s-list-item>Fetches all products from your Shopify store using GraphQL API</s-list-item>
          <s-list-item>Collects product details: name, variants, prices, stock levels, SKUs</s-list-item>
          <s-list-item>Sends data securely to your Sales Rep Dashboard API</s-list-item>
          <s-list-item>Stores products in MySQL database with sync tracking</s-list-item>
          <s-list-item>Updates stock levels and pricing in real-time</s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section heading="Sync Button Functionality">
        <s-paragraph>
          <strong>🎯 Sync Button Features:</strong>
        </s-paragraph>
        <s-unordered-list>
          <s-list-item><strong>Unlimited Products:</strong> Handles any catalog size through pagination</s-list-item>
          <s-list-item><strong>Real-time Updates:</strong> Syncs current stock levels and prices</s-list-item>
          <s-list-item><strong>Secure Transfer:</strong> Uses token-based authentication</s-list-item>
          <s-list-item><strong>Error Handling:</strong> Comprehensive logging and retry logic</s-list-item>
          <s-list-item><strong>Status Tracking:</strong> Shows sync progress and results</s-list-item>
        </s-unordered-list>
      </s-section>

      <s-section heading="Data Storage">
        <s-paragraph>
          <strong>📊 Where Product Data is Stored:</strong>
        </s-paragraph>
        <s-unordered-list>
          <s-list-item><strong>Source:</strong> Your Shopify store (via Shopify Admin API)</s-list-item>
          <s-list-item><strong>Destination:</strong> Your Sales Rep Dashboard MySQL database</s-list-item>
          <s-list-item><strong>Table:</strong> <code>shopify_products</code> in your database</s-list-item>
          <s-list-item><strong>Sync Tracking:</strong> <code>last_synced</code> and <code>sync_status</code> columns</s-list-item>
          <s-list-item><strong>Product Details:</strong> ID, title, variants, prices, stock, images</s-list-item>
        </s-unordered-list>
        
        <s-paragraph>
          <strong>🔗 API Endpoint:</strong> <code>https://yourwebsite.com/api/sync_products.php</code>
        </s-paragraph>
      </s-section>

      <s-section heading="Quick Actions">
        <s-paragraph>
          <strong>🚀 Get Started:</strong>
        </s-paragraph>
        <s-paragraph>
          <s-link href="/app/products" style={{ 
            display: "inline-block", 
            padding: "12px 24px", 
            backgroundColor: "#3b82f6", 
            color: "white", 
            textDecoration: "none", 
            borderRadius: "6px",
            fontWeight: "500"
          }}>
            View & Sync Products →
          </s-link>
        </s-paragraph>
        <s-paragraph>
          Click the button above to view your products and sync them to your Sales Rep Dashboard.
        </s-paragraph>
      </s-section>

      <s-section heading="Technical Details">
        <s-paragraph>
          <strong>⚙️ Technology Stack:</strong>
        </s-paragraph>
        <s-unordered-list>
          <s-list-item><strong>Frontend:</strong> React Router + Shopify Polaris</s-list-item>
          <s-list-item><strong>Backend:</strong> Shopify Admin GraphQL API</s-list-item>
          <s-list-item><strong>API:</strong> PHP endpoint with MySQL database</s-list-item>
          <s-list-item><strong>Authentication:</strong> Shopify App Bridge + Token-based</s-list-item>
          <s-list-item><strong>Sync Method:</strong> Real-time GraphQL fetching + REST API posting</s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}
