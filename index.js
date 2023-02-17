// set value in custom fields
lineitem_list = List();
delivery_m = Map();
delivery_m.put("api_name","cf_delivery_m");
delivery_m.put("customfield_id","2628667000000962513");
delivery_m.put("value",ifnull(data.get("shipping").get("company"),""));
custom_field_list.add(delivery_m);

//adding Line Items
for each  rec in data.get("items")
{
    searchParam = {"sku":rec.get("sku")};
    item_get_resp = zoho.books.getRecords("items",orgID,searchParam,"zoho_books");
    items = item_get_resp.get("items");
    if(items.size() > 0)
    {
        item = items.get(0);
        item_id = item.get("item_id");
        item_name = rec.get("name");
        sku = rec.get("sku");
        // 			rate = rec.get("product").get("price").get("amount");
        rate = ifnull(ifnull(ifnull(rec.get("amounts"),"{}").get("price_without_tax"),"{}").get("amount"),0);
        qty = rec.get("quantity");
        tax_percent = rec.get("amounts").get("tax").get("percent");
        tax_percent_value = if(ifnull(tax_percent,"") == "",0,tax_percent.toLong());
        tax_id_map = if(tax_percent_value == 0,{"tax_exemption_id":tax_id_exempt},{"tax_id":tax_id_15Prcnt});
        total_discount = rec.get("amounts").get("total_discount").get("amount");
        line_item_map = Map();
        line_item_map.put("item_id",item_id);
        line_item_map.put("name",item_name);
        line_item_map.put("sku",sku);
        line_item_map.put("rate",rate);
        line_item_map.put("quantity",qty);
        line_item_map.putAll(tax_id_map);
        line_item_map.put("discount",total_discount);
        line_item_map.put("warehouse_id",warehouse_id);
        lineitem_list.add(line_item_map);
    }
}

//Search Records in Zoho Books
customerData = data.get("customer");
customer_Param = {"cf_salla_id":customerData.get("id")};
customer_resp = zoho.books.getRecords("contacts",orgID,customer_Param,"zoho_books");

//Create Records in Zoho Books
createBooksCustomer = zoho.books.createRecord("contacts",orgID,cus_datamap,"zoho_books");

//Change Sales Order Status
approve_resp = invokeurl
[
    url :"https://inventory.zoho.com/api/v1/salesorders/" + Salesorder_ID + "/approve?organization_id=" + orgID
    type :POST
    connection:"zinventory_connection"
];
info approve_resp.get("message");
//////////// confirm ////////////////////
confirm_resp = invokeurl
[
    url :"https://inventory.zoho.com/api/v1/salesorders/" + Salesorder_ID + "/status/confirmed?organization_id=" + orgID
    type :POST
    connection:"zinventory_connection"
];
info confirm_resp.get("message");

//Convert Sales Order to Invoice
convert_response = invokeurl
[
    url :"https://books.zoho.com/api/v3/invoices/fromsalesorder?organization_id=" + orgID + "&salesorder_id=" + Salesorder_ID
    type :POST
    connection:"zoho_books"
];
info convert_response.get("message");

//Invoice APIs
get_invoice = invokeurl
[
    url :"https://inventory.zoho.com/api/v1/invoices/" + invoiceID + "?organization_id=" + orgID
    type :GET
    connection:"zinventory_connection"
];
invoice = get_invoice.get("invoice");
////////// submit ////////////////////
resp1 = invokeurl
[
    url :"https://inventory.zoho.com/api/v1/invoices/" + invoiceID + "/submit?organization_id=" + orgID
    type :POST
    connection:"zinventory_connection"
];
//APPROVE 
resp2 = invokeurl
[
    url :"https://inventory.zoho.com/api/v1/invoices/" + invoiceID + "/approve?organization_id=" + orgID
    type :POST
    connection:"zinventory_connection"
];
// 		Mark as Sent
sent = invokeurl
[
    url :"https://inventory.zoho.com/api/v1/invoices/" + invoiceID + "/status/sent?organization_id=" + orgID
    type :POST
    connection:"zinventory_connection"
];

//Inventory API
pays = Map();
pays.put("customer_id",customerID);
pays.put("date",invoicedate);
pays.put("payment_mode",payment_mode);
pays.put("amount",amount);
pays.put("invoices",invoices);
pays.put("account_id",account_id);
pays.put("reference_number",ref_no);
pays.put("invoice_id",invoiceID);
pays.put("amount_applied",amount);
jsonstring = Map();
jsonstring.put("JSONString",pays);
res = invokeurl
[
url :"https://inventory.zoho.com/api/v1/customerpayments?organization_id=" + orgID
type :POST
parameters:jsonstring
connection:"zinventory_connection"
];
info res;

