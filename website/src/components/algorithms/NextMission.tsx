import "../../styles/algorithms.css";

type Props = {
  /** Site path of the next page, e.g. /algorithms/programming/quicksort/. */
  href: string;
  /** The next page's name, as the reader will see it. */
  title: string;
  /** One line that makes the next page worth opening. Plain text only. */
  teaser: string;
};

/**
 * The end-of-page pull to the next mission. It turns finishing a page into a
 * reason to open another one. Static.
 */
export default function NextMission({ href, title, teaser }: Props) {
  return (
    <a className="alg-nextmission" href={href}>
      <span className="alg-nextmission__label">Next mission</span>
      <span className="alg-nextmission__title">{title}</span>
      <span className="alg-nextmission__teaser">{teaser}</span>
    </a>
  );
}
