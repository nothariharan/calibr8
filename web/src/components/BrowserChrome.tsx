export function BrowserChrome({ url }: { url: string }) {
  return (
    <div className="browser-top">
      <span className="dot dot-r" />
      <span className="dot dot-y" />
      <span className="dot dot-g" />
      <span className="browser-url">{url}</span>
    </div>
  );
}
