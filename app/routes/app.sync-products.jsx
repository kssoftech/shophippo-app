import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  // Handle GET requests - just return basic info
  await authenticate.admin(request);
  return { message: "Sync endpoint is active" };
};

export const action = async ({ request }) => {
  try {
    console.log('Sync request received');
    
    const { admin } = await authenticate.admin(request);
    console.log('Authentication successful');
    
    let body;
    try {
      body = await request.json();
      console.log('JSON parsed successfully');
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return Response.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }
    
    const { targetUrl, syncToken } = body;
    console.log('Extracted targetUrl:', targetUrl);
    
    // Validate target URL and token (security measure)
    if (!targetUrl || !syncToken) {
      console.error('Missing required fields');
      return Response.json({ error: "Missing target URL or sync token" }, { status: 400 });
    }
    
    // Fetch all products with pagination
    let allProducts = [];
    let cursor = null;
    let hasMore = true;
    
    console.log('Starting products fetch...');
    while (hasMore) {
      console.log(`Fetching products with cursor:`, cursor);
      
      const response = await admin.graphql(
        `#graphql
          query getProducts($first: Int!, $after: String) {
            products(first: $first, after: $after) {
              edges {
                cursor
                node {
                  id
                  title
                  totalInventory
                  featuredImage {
                    url
                    altText
                  }
                  variants(first: 50) {
                    edges {
                      node {
                        id
                        title
                        price
                        compareAtPrice
                        sku
                        barcode
                        inventoryQuantity
                        availableForSale
                      }
                    }
                  }
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        `,
        {
          variables: {
            first: 250,
            after: cursor
          }
        }
      );
      
      const data = await response.json();
      console.log('GraphQL response received, errors:', data.errors);
      
      if (data.errors) {
        console.error('GraphQL errors:', data.errors);
        throw new Error(`GraphQL errors: ${data.errors.map(e => e.message).join(', ')}`);
      }
      
      const products = data.data.products.edges.map(edge => ({
        id: edge.node.id,
        title: edge.node.title,
        totalInventory: edge.node.totalInventory,
        featuredImage: edge.node.featuredImage?.url || null,
        variants: edge.node.variants.edges.map(variantEdge => ({
          id: variantEdge.node.id,
          title: variantEdge.node.title,
          price: variantEdge.node.price,
          compareAtPrice: variantEdge.node.compareAtPrice,
          sku: variantEdge.node.sku,
          barcode: variantEdge.node.barcode,
          inventoryQuantity: variantEdge.node.inventoryQuantity,
          availableForSale: variantEdge.node.availableForSale
        }))
      }));
      
      console.log(`Processed ${products.length} products from this batch`);
      allProducts = allProducts.concat(products);
      hasMore = data.data.products.pageInfo.hasNextPage;
      cursor = data.data.products.pageInfo.endCursor;
      console.log(`Total products so far: ${allProducts.length}, hasMore: ${hasMore}`);
    }
    
    console.log(`Finished fetching ${allProducts.length} total products`);
    
    // Send products to your website
    console.log(`Sending products to: ${targetUrl}`);
    const syncPayload = {
      products: allProducts,
      totalCount: allProducts.length,
      syncTimestamp: new Date().toISOString()
    };
    console.log('Sync payload size (characters):', JSON.stringify(syncPayload).length);
    
    const syncResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Token': syncToken
      },
      body: JSON.stringify(syncPayload)
    });
    
    console.log('Website response status:', syncResponse.status);
    console.log('Website response ok:', syncResponse.ok);
    
    if (!syncResponse.ok) {
      const errorText = await syncResponse.text();
      console.error('Website response error:', errorText);
      throw new Error(`Failed to sync to website: ${syncResponse.statusText} - ${errorText}`);
    }
    
    return Response.json({ 
      success: true, 
      productsSynced: allProducts.length,
      message: `Successfully synced ${allProducts.length} products to Sales Rep Dashboard`
    });
    
  } catch (error) {
    console.error('Sync error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
};

export default function SyncProductsPage() {
  const data = useLoaderData();
  
  return (
    <s-page heading="Product Sync API">
      <s-section heading="Product Sync Endpoint">
        <s-paragraph>
          <strong>Status:</strong> {data?.message || "API endpoint is active"}
        </s-paragraph>
        <s-paragraph>
          <strong>Method:</strong> POST to <code>/app/sync-products</code>
        </s-paragraph>
        <s-paragraph>
          <strong>Purpose:</strong> Handles product synchronization from Shopify to your Sales Rep Dashboard
        </s-paragraph>
        <s-paragraph>
          This is an API endpoint. Use the "Sync Products" button in the Products page to trigger synchronization.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}
