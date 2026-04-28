import { useLoaderData, useSearchParams, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  try {
    const { admin } = await authenticate.admin(request);
    const url = new URL(request.url);
    const cursor = url.searchParams.get("cursor");
    const first = parseInt(url.searchParams.get("first") || "20");
    
    const response = await admin.graphql(
      `#graphql
        query getProducts($first: Int!, $after: String) {
          products(first: $first, after: $after) {
            edges {
              node {
                id
                title
                handle
                status
                variants(first: 10) {
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
                featuredImage {
                  url
                  altText
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
              startCursor
              hasPreviousPage
            }
          }
        }
      `,
      {
        variables: {
          first,
          after: cursor,
        },
      }
    );

    const responseJson = await response.json();
    
    if (responseJson.errors) {
      throw new Error(`GraphQL errors: ${responseJson.errors.map(e => e.message).join(', ')}`);
    }
    
    return { 
      products: responseJson.data.products,
      pagination: {
        hasNextPage: responseJson.data.products.pageInfo.hasNextPage,
        hasPreviousPage: responseJson.data.products.pageInfo.hasPreviousPage,
        endCursor: responseJson.data.products.pageInfo.endCursor,
        startCursor: responseJson.data.products.pageInfo.startCursor,
        currentPage: Math.ceil((url.searchParams.get("page") || "1") * 1),
        itemsPerPage: first
      }
    };
  } catch (error) {
    console.error('Error fetching products:', error);
    throw new Response(`Error fetching products: ${error.message}`, { status: 500 });
  }
};

export default function ProductsPage() {
  const { products, pagination } = useLoaderData();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const handlePageChange = (newCursor, isNext = true) => {
    const params = new URLSearchParams(searchParams);
    if (newCursor) {
      params.set("cursor", newCursor);
    } else {
      params.delete("cursor");
    }
    const currentPage = parseInt(searchParams.get("page") || "1");
    params.set("page", isNext ? currentPage + 1 : currentPage - 1);
    navigate(`${window.location.pathname}?${params.toString()}`);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    const params = new URLSearchParams(searchParams);
    params.set("first", newItemsPerPage);
    params.delete("cursor");
    params.set("page", "1");
    navigate(`${window.location.pathname}?${params.toString()}`);
  };

  // Calculate summary data
  const productsOnSale = products.edges.filter(({ node: product }) =>
    product.variants.edges.some(({ node: variant }) =>
      variant.compareAtPrice && variant.compareAtPrice !== variant.price
    )
  ).length;

  const lowStockItems = products.edges.reduce((count, { node: product }) => 
    count + product.variants.edges.filter(({ node: variant }) =>
      variant.inventoryQuantity <= 5 && variant.inventoryQuantity > 0
    ).length, 0
  );

  return (
    <s-page heading="Products">
      {/* Horizontal Summary at Top */}
      <s-section heading="Product Summary">
        <div style={{ 
          display: "flex", 
          gap: "16px", 
          flexWrap: "wrap", 
          justifyContent: "flex-start",
          alignItems: "stretch"
        }}>
          <div style={{ 
            flex: "1", 
            minWidth: "120px", 
            maxWidth: "200px",
            padding: "16px", 
            border: "1px solid #e1e3e5", 
            borderRadius: "8px", 
            backgroundColor: "#f9fafb",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#1f2937", marginBottom: "4px" }}>
              {products.edges.length}
            </div>
            <div style={{ fontSize: "14px", color: "#6b7280" }}>Products</div>
          </div>
          
          <div style={{ 
            flex: "1", 
            minWidth: "120px", 
            maxWidth: "200px",
            padding: "16px", 
            border: "1px solid #e1e3e5", 
            borderRadius: "8px", 
            backgroundColor: "#f9fafb",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#1f2937", marginBottom: "4px" }}>
              {productsOnSale}
            </div>
            <div style={{ fontSize: "14px", color: "#6b7280" }}>On Sale</div>
          </div>
          
          <div style={{ 
            flex: "1", 
            minWidth: "120px", 
            maxWidth: "200px",
            padding: "16px", 
            border: "1px solid #e1e3e5", 
            borderRadius: "8px", 
            backgroundColor: "#f9fafb",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#1f2937", marginBottom: "4px" }}>
              {lowStockItems}
            </div>
            <div style={{ fontSize: "14px", color: "#6b7280" }}>Low Stock</div>
          </div>
        </div>
      </s-section>

      <s-section heading="All Products">
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Items per page selector */}
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "12px",
            flexWrap: "wrap"
          }}>
            <span style={{ fontSize: "14px", color: "#374151" }}>Show:</span>
            <select
              value={pagination.itemsPerPage.toString()}
              onChange={(e) => handleItemsPerPageChange(e.target.value)}
              style={{
                padding: "6px 12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
                backgroundColor: "white"
              }}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span style={{ fontSize: "14px", color: "#374151" }}>per page</span>
          </div>

          {!products || products.edges.length === 0 ? (
            <div style={{ 
              padding: "40px", 
              textAlign: "center", 
              color: "#6b7280",
              fontSize: "16px"
            }}>
              No products found.
            </div>
          ) : (
            <>
              {/* Responsive Table */}
              <div style={{ 
                overflowX: "auto", 
                border: "1px solid #e1e3e5",
                borderRadius: "8px",
                backgroundColor: "white"
              }}>
                <table style={{ 
                  width: "100%", 
                  borderCollapse: "collapse", 
                  fontSize: "14px",
                  minWidth: "800px"
                }}>
                  <thead>
                    <tr style={{ 
                      borderBottom: "2px solid #e1e3e5", 
                      backgroundColor: "#f9fafb",
                      height: "48px"
                    }}>
                      <th style={{ 
                        padding: "12px 16px", 
                        textAlign: "left", 
                        fontWeight: "600",
                        color: "#374151",
                        fontSize: "13px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em"
                      }}>Image</th>
                      <th style={{ 
                        padding: "12px 16px", 
                        textAlign: "left", 
                        fontWeight: "600",
                        color: "#374151",
                        fontSize: "13px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em"
                      }}>Product Name</th>
                      <th style={{ 
                        padding: "12px 16px", 
                        textAlign: "left", 
                        fontWeight: "600",
                        color: "#374151",
                        fontSize: "13px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em"
                      }}>Variant</th>
                      <th style={{ 
                        padding: "12px 16px", 
                        textAlign: "left", 
                        fontWeight: "600",
                        color: "#374151",
                        fontSize: "13px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em"
                      }}>SKU</th>
                      <th style={{ 
                        padding: "12px 16px", 
                        textAlign: "left", 
                        fontWeight: "600",
                        color: "#374151",
                        fontSize: "13px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em"
                      }}>Price</th>
                      <th style={{ 
                        padding: "12px 16px", 
                        textAlign: "left", 
                        fontWeight: "600",
                        color: "#374151",
                        fontSize: "13px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em"
                      }}>Stock</th>
                      <th style={{ 
                        padding: "12px 16px", 
                        textAlign: "left", 
                        fontWeight: "600",
                        color: "#374151",
                        fontSize: "13px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em"
                      }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.edges.map(({ node: product }) => 
                      product.variants.edges.map(({ node: variant }, variantIndex) => (
                        <tr key={`${product.id}-${variant.id}`} style={{ 
                          borderBottom: "1px solid #f3f4f6",
                          transition: "background-color 0.2s ease"
                        }}>
                          {variantIndex === 0 && (
                            <td rowSpan={product.variants.edges.length} style={{ 
                              padding: "16px", 
                              verticalAlign: "middle",
                              backgroundColor: variantIndex % 2 === 0 ? "#ffffff" : "#f9fafb"
                            }}>
                              {product.featuredImage && (
                                <img
                                  src={product.featuredImage.url}
                                  alt={product.featuredImage.altText || product.title}
                                  style={{
                                    width: "60px",
                                    height: "60px",
                                    objectFit: "cover",
                                    borderRadius: "8px",
                                    border: "1px solid #e5e7eb"
                                  }}
                                />
                              )}
                            </td>
                          )}
                          {variantIndex === 0 && (
                            <td rowSpan={product.variants.edges.length} style={{ 
                              padding: "16px", 
                              verticalAlign: "middle", 
                              fontWeight: "500",
                              color: "#1f2937",
                              backgroundColor: variantIndex % 2 === 0 ? "#ffffff" : "#f9fafb"
                            }}>
                              {product.title}
                            </td>
                          )}
                          <td style={{ 
                            padding: "16px",
                            color: "#4b5563",
                            backgroundColor: variantIndex % 2 === 0 ? "#ffffff" : "#f9fafb"
                          }}>
                            {variant.title}
                          </td>
                          <td style={{ 
                            padding: "16px", 
                            color: "#6b7280",
                            fontFamily: "monospace",
                            fontSize: "13px",
                            backgroundColor: variantIndex % 2 === 0 ? "#ffffff" : "#f9fafb"
                          }}>
                            {variant.sku || "N/A"}
                          </td>
                          <td style={{ 
                            padding: "16px",
                            backgroundColor: variantIndex % 2 === 0 ? "#ffffff" : "#f9fafb"
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                              <span style={{ 
                                fontWeight: "600", 
                                color: "#1f2937",
                                fontSize: "15px"
                              }}>
                                ${variant.price}
                              </span>
                              {variant.compareAtPrice && variant.compareAtPrice !== variant.price && (
                                <>
                                  <span style={{ 
                                    textDecoration: "line-through", 
                                    color: "#9ca3af", 
                                    fontSize: "13px"
                                  }}>
                                    ${variant.compareAtPrice}
                                  </span>
                                  <span style={{ 
                                    backgroundColor: "#10b981", 
                                    color: "white", 
                                    padding: "3px 8px", 
                                    borderRadius: "12px", 
                                    fontSize: "11px",
                                    fontWeight: "600",
                                    letterSpacing: "0.025em"
                                  }}>
                                    SALE
                                  </span>
                                </>
                              )}
                            </div>
                          </td>
                          <td style={{ 
                            padding: "16px",
                            backgroundColor: variantIndex % 2 === 0 ? "#ffffff" : "#f9fafb"
                          }}>
                            <span style={{ 
                              color: variant.inventoryQuantity > 0 ? "#059669" : "#dc2626",
                              fontWeight: variant.inventoryQuantity === 0 ? "600" : "500",
                              fontSize: "14px"
                            }}>
                              {variant.inventoryQuantity || 0}
                            </span>
                          </td>
                          <td style={{ 
                            padding: "16px",
                            backgroundColor: variantIndex % 2 === 0 ? "#ffffff" : "#f9fafb"
                          }}>
                            <span style={{ 
                              display: "inline-block",
                              backgroundColor: variant.availableForSale ? "#10b981" : "#ef4444",
                              color: "white",
                              padding: "6px 12px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: "600",
                              letterSpacing: "0.025em",
                              textAlign: "center",
                              minWidth: "100px",
                              whiteSpace: "nowrap"
                            }}>
                              {variant.availableForSale ? "Available" : "Out of Stock"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div style={{ 
                display: "flex", 
                justifyContent: "center", 
                alignItems: "center", 
                gap: "16px",
                padding: "20px 0"
              }}>
                <button
                  disabled={!pagination.hasPreviousPage}
                  onClick={() => handlePageChange(pagination.startCursor, false)}
                  style={{
                    padding: "8px 16px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    backgroundColor: pagination.hasPreviousPage ? "white" : "#f9fafb",
                    color: pagination.hasPreviousPage ? "#374151" : "#9ca3af",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: pagination.hasPreviousPage ? "pointer" : "not-allowed",
                    transition: "all 0.2s ease"
                  }}
                >
                  Previous
                </button>
                
                <span style={{ 
                  fontSize: "14px", 
                  color: "#374151",
                  fontWeight: "500",
                  padding: "8px 16px"
                }}>
                  Page {pagination.currentPage}
                </span>
                
                <button
                  disabled={!pagination.hasNextPage}
                  onClick={() => handlePageChange(pagination.endCursor, true)}
                  style={{
                    padding: "8px 16px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    backgroundColor: pagination.hasNextPage ? "white" : "#f9fafb",
                    color: pagination.hasNextPage ? "#374151" : "#9ca3af",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: pagination.hasNextPage ? "pointer" : "not-allowed",
                    transition: "all 0.2s ease"
                  }}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </s-section>
    </s-page>
  );
}
