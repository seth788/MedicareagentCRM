import { redirect } from "next/navigation"

/** Shared book clients now appear on the Clients page. Redirect to clients. */
export default function SharedBookPage() {
  redirect("/clients")
}
