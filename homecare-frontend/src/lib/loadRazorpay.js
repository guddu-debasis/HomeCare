// Loads Razorpay's checkout.js on demand instead of on every page load.
// Cached as a module-level promise so repeat checkout attempts (or a second
// mount of Cart.jsx) reuse the same in-flight/completed load instead of
// injecting duplicate <script> tags.
let razorpayLoadPromise = null;

export function loadRazorpayScript() {
  if (typeof window !== "undefined" && window.Razorpay) {
    return Promise.resolve(true);
  }

  if (razorpayLoadPromise) return razorpayLoadPromise;

  razorpayLoadPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      // Let the caller decide how to fail (e.g. show an error toast) —
      // don't throw here, and reset the cache so a retry is possible.
      razorpayLoadPromise = null;
      resolve(false);
    };
    document.head.appendChild(script);
  });

  return razorpayLoadPromise;
}
