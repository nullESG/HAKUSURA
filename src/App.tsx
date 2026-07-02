/**
 * アプリのルート。画面実装はブロックD(下部タブ+スワイプ切替)で行う。
 * ここでは縦画面・セーフエリア対応のシェルだけを置く。
 */
export function App() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-neutral-950 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] text-neutral-200">
      <h1 className="text-2xl font-bold tracking-widest">HAKUSURA</h1>
      <p className="mt-2 text-sm text-neutral-500">under construction — Block A</p>
    </div>
  );
}
