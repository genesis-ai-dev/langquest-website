import Header from './Header';
import Footer from './Footer';

const WebPageWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 mx-auto">{children}</main>
      <Footer />
    </div>
  );
};

export default WebPageWrapper;
