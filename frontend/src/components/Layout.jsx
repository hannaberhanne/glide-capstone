import Header from "./Header.jsx";
import FooterNav from "./FooterNav.jsx";
import "./Layout.css";

export default function Layout({ children }) {
  return (
    <div className="app-layout">
      <Header />
      <main className="app-main">{children}</main>
      <FooterNav />
    </div>
  );
}
