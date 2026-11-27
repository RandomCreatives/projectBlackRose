import { formatPrice, type Menu } from "@/lib/menu";

export default function MenuSection({ menu }: { menu: Menu }) {
  const live = menu.categories.filter((c) => c.items.length > 0);

  return (
    <section className="sec" id="menu" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <p className="eyebrow rv">The menu</p>
        <h2 className="rv" style={{ maxWidth: "20ch" }}>
          One house cocktail, and a short list done <em>properly</em>.
        </h2>

        {live.map((cat) => (
          <div className="menu-cat" key={cat.id}>
            <div className="menu-cat-head rv">
              <h3>{cat.name}</h3>
              {cat.note ? <p>{cat.note}</p> : null}
            </div>
            <div className="grid3">
              {cat.items.map((item, i) => {
                const price = formatPrice(item.price_cents, item.currency);
                return (
                  <article className="card rv" key={item.id} style={{ transitionDelay: `${i * 0.08}s` }}>
                    <div className="k">{cat.kicker || cat.name}</div>
                    <h4>{item.name}</h4>
                    {item.description ? <p>{item.description}</p> : null}
                    <div className="price">
                      <span>
                        {item.badge || (item.is_signature ? "Signature" : "")}
                      </span>
                      <em>{price ?? item.price_note ?? "Ask at the bar"}</em>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ))}

        <div className="rv" style={{ marginTop: 32 }}>
          <a className="btn" href="#visit">
            Reserve for the evening <span className="arw">→</span>
          </a>
        </div>

        {menu.source === "fallback" ? (
          <p className="note rv">
            <b>Menu —</b> the full list is being moved into the owners’ system. The Black Rose is the house
            cocktail and is always on.
          </p>
        ) : null}
      </div>
    </section>
  );
}
