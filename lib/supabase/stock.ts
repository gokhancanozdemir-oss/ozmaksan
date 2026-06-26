import { createClient } from "./client";

export type StockAddResult = {
  product_id: string;
  product_name: string;
  added: number;
  unit: string;
  new_stock: number;
};

export async function addStockByQrCode(
  qrCode: string,
  quantity: number,
  unit: string,
  notes?: string
): Promise<StockAddResult> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("add_stock_by_qr", {
    p_qr_code: qrCode,
    p_quantity: quantity,
    p_unit: unit,
    p_notes: notes ?? null,
  });

  if (error) throw new Error(error.message);
  return data as StockAddResult;
}
