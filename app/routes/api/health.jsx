import { authenticate } from "../../shopify.server";

export const loader = async ({ request }) => {
  try {
    // Basic health check - just verify the app is running
    await authenticate.admin(request);
    
    return Response.json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      app: "ShopHippo",
      version: "1.0.0"
    });
  } catch (error) {
    return Response.json(
      { 
        status: "unhealthy", 
        error: "Authentication failed",
        timestamp: new Date().toISOString()
      }, 
      { status: 503 }
    );
  }
};
