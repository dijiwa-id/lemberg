import os
import logging
from typing import Optional, List, Any

# Resend is preferred as per instructions.
try:
    import resend
    RESEND_AVAILABLE = True
except ImportError:
    RESEND_AVAILABLE = False

logger = logging.getLogger("lemberg.email")

def send_order_notification(
    order_id: int,
    customer_name: str,
    customer_email: str,
    customer_phone: str,
    address: str,
    items: List[Any],
    notes: Optional[str] = None
):
    """
    Sends a notification email to the admin when a new order is placed.
    """
    api_key = os.environ.get("RESEND_API_KEY")
    # Updated as per user request
    admin_email = os.environ.get("ADMIN_EMAIL", "dijiwa.id@gmail.com")
    
    if not api_key:
        logger.warning("RESEND_API_KEY not set. Mocking email success for order #%s", order_id)
        return True

    if not RESEND_AVAILABLE:
        logger.error("resend package not installed. Mocking email success for order #%s", order_id)
        return True

    resend.api_key = api_key

    subject = f"New Wine Collection Order #{order_id} - {customer_name}"
    
    # Format items table
    items_rows = ""
    total_amount = 0
    for item in items:
        name = item.get("name", "Unknown")
        vintage = item.get("vintage")
        qty = item.get("quantity", 0)
        price = item.get("price", 0)
        subtotal = qty * price
        total_amount += subtotal
        
        display_name = f"{name} ({vintage})" if vintage else name
        items_rows += f"""
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">{display_name}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">{qty}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">R{price:,.2f}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">R{subtotal:,.2f}</td>
        </tr>
        """

    html_content = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #1a1a1a; border-bottom: 1px solid #eee; padding-bottom: 10px;">New Wine Order Received</h2>
        <p>A new order has been placed for the Wine Collection.</p>
        
        <h3 style="color: #333; margin-top: 20px;">Customer Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
            <tr>
                <td style="padding: 8px; font-weight: bold; width: 120px; border-bottom: 1px solid #f9f9f9;">Order ID:</td>
                <td style="padding: 8px; border-bottom: 1px solid #f9f9f9;">#{order_id}</td>
            </tr>
            <tr>
                <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #f9f9f9;">Name:</td>
                <td style="padding: 8px; border-bottom: 1px solid #f9f9f9;">{customer_name}</td>
            </tr>
            <tr>
                <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #f9f9f9;">Email:</td>
                <td style="padding: 8px; border-bottom: 1px solid #f9f9f9;">{customer_email}</td>
            </tr>
            <tr>
                <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #f9f9f9;">Phone:</td>
                <td style="padding: 8px; border-bottom: 1px solid #f9f9f9;">{customer_phone}</td>
            </tr>
            <tr>
                <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #f9f9f9;">Address:</td>
                <td style="padding: 8px; border-bottom: 1px solid #f9f9f9;">{address}</td>
            </tr>
        </table>
        
        <h3 style="color: #333; margin-top: 25px;">Order Summary</h3>
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background-color: #f8f8f8;">
                    <th style="padding: 8px; text-align: left; border-bottom: 2px solid #eee;">Item</th>
                    <th style="padding: 8px; text-align: center; border-bottom: 2px solid #eee;">Qty</th>
                    <th style="padding: 8px; text-align: right; border-bottom: 2px solid #eee;">Price</th>
                    <th style="padding: 8px; text-align: right; border-bottom: 2px solid #eee;">Total</th>
                </tr>
            </thead>
            <tbody>
                {items_rows}
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="3" style="padding: 12px 8px; text-align: right; font-weight: bold;">Grand Total:</td>
                    <td style="padding: 12px 8px; text-align: right; font-weight: bold; color: #1a1a1a; font-size: 18px;">R{total_amount:,.2f}</td>
                </tr>
            </tfoot>
        </table>
        
        <div style="margin-top: 20px; padding: 15px; background-color: #fdfdfd; border-left: 4px solid #eee;">
            <p style="margin: 0; font-weight: bold; font-size: 14px; color: #666;">Notes:</p>
            <p style="margin: 5px 0 0 0; color: #333;">{notes or "No additional notes provided."}</p>
        </div>
        
        <p style="color: #888; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
            This is an automated notification from the Lemberg Winery CMS.
        </p>
    </div>
    """

    try:
        params = {
            "from": "Lemberg Winery <orders@lemberg-winery.com>",
            "to": [admin_email],
            "subject": subject,
            "html": html_content,
        }
        
        resend.Emails.send(params)
        logger.info("Email notification sent for order #%s to %s", order_id, admin_email)
        return True
    except Exception as e:
        logger.exception("Failed to send email notification for order #%s: %s", order_id, e)
        return False
