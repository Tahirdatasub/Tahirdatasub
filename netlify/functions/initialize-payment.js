
exports.handler = async (event) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  };

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        error: "Method not allowed"
      })
    };
  }

  try {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    if (!secretKey) {
      throw new Error("Payment service is not configured");
    }

    const { email, amountNaira } = JSON.parse(event.body || "{}");

    if (
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      typeof amountNaira !== "number" ||
      !Number.isSafeInteger(amountNaira) ||
      amountNaira < 50 ||
      amountNaira > 1000000
    ) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Enter a valid email and amount between ₦50 and ₦1,000,000"
        })
      };
    }

    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          amount: amountNaira * 100,
          currency: "NGN"
        })
      }
    );

    const result = await response.json();

    if (!response.ok || !result.status || !result.data?.authorization_url) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: "Could not initialize payment. Please try again."
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        authorization_url: result.data.authorization_url,
        reference: result.data.reference
      })
    };
  } catch (error) {
    console.error("Payment initialization failed:", error.message);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Payment service temporarily unavailable"
      })
    };
  }
};
