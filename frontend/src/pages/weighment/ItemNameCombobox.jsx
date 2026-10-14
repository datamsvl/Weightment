import { useEffect, useMemo, useRef, useState } from "react";

export const ITEM_OPTIONS = [
  "Dibba",
  "C. Tin",
  "Tin",
  "Tin Target",
  "Light",
  "Light Target",
  "Kawadi",
  "Selected Us",
  "Selected Os",
  "P2P Us",
  "P2P Os",
  "Mh",
  "Cast Iron Us",
  "Cast Iron Os",
  "Car Body Us",
  "Car Body Os",
  "Turning",
  "Jhanga",
  "Light Press Bundle",
  "Turning Press Bundle",
  "Jhanga Bundle",
  "Gi Heavy",
  "Gi Bundle.",
  "Shocker",
  "Dust",
];

// Searchable dropdown: typing "s" lists every item that starts with
// or contains "s" (items starting with the text come first).
export default function ItemNameCombobox({
  value,
  onChange,
  placeholder = "Enter item name",
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [position, setPosition] = useState(null);

  const inputRef = useRef(null);
  const listRef = useRef(null);

  const query = (value || "").trim().toLowerCase();

  const matches = useMemo(() => {
    if (!query) return ITEM_OPTIONS;

    const starts = [];
    const contains = [];

    ITEM_OPTIONS.forEach((option) => {
      const lower = option.toLowerCase();

      if (lower.startsWith(query)) starts.push(option);
      else if (lower.includes(query)) contains.push(option);
    });

    return [...starts, ...contains];
  }, [query]);

  const updatePosition = () => {
    if (!inputRef.current) return;

    const rect = inputRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 200 && rect.top > spaceBelow;

    setPosition({
      left: rect.left,
      width: Math.max(rect.width, 180),
      top: openUp ? undefined : rect.bottom + 4,
      bottom: openUp ? window.innerHeight - rect.top + 4 : undefined,
      maxHeight: Math.max(
        120,
        Math.min(240, (openUp ? rect.top : spaceBelow) - 12)
      ),
    });
  };

  useEffect(() => {
    if (!open) return undefined;

    updatePosition();

    const handleOutside = (event) => {
      if (
        inputRef.current?.contains(event.target) ||
        listRef.current?.contains(event.target)
      ) {
        return;
      }
      setOpen(false);
    };

    const handleScrollResize = (event) => {
      // keep the list scrollable without closing it
      if (listRef.current?.contains(event.target)) return;
      updatePosition();
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    window.addEventListener("scroll", handleScrollResize, true);
    window.addEventListener("resize", handleScrollResize);

    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      window.removeEventListener("scroll", handleScrollResize, true);
      window.removeEventListener("resize", handleScrollResize);
    };
  }, [open]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [query]);

  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;

    listRef.current
      .querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const choose = (option) => {
    onChange(option);
    setOpen(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) setOpen(true);
      setActiveIndex((prev) =>
        matches.length ? (prev + 1) % matches.length : -1
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) =>
        matches.length
          ? (prev - 1 + matches.length) % matches.length
          : -1
      );
    } else if (event.key === "Enter" && open && activeIndex >= 0) {
      event.preventDefault();
      choose(matches[activeIndex]);
    } else if (event.key === "Escape" || event.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div className="cw-combo">
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />

      {open && position && (
        <ul
          ref={listRef}
          className="cw-combo-list"
          role="listbox"
          style={position}
        >
          {matches.length === 0 ? (
            <li className="cw-combo-empty">
              No match — custom name will be used
            </li>
          ) : (
            matches.map((option, index) => (
              <li
                key={option}
                data-index={index}
                role="option"
                aria-selected={index === activeIndex}
                className={`cw-combo-option${
                  index === activeIndex ? " is-active" : ""
                }`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(option);
                }}
                onMouseEnter={() => setActiveIndex(index)}
              >
                {option}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}