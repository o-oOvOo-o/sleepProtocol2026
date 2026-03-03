import { HomeIcon } from "@heroicons/react/solid";
import Link from "next/link";
import { useRouter } from "next/router";

const Breadcrumbs = () => {
  const router = useRouter();
  const { asPath } = router;
  const path = asPath.split("/").filter((item) => item !== "");

  return (
    <div className="text-sm breadcrumbs pb-4 lg:pb-8">
      <ul>
        <li>
          <Link href="/app/dashboard" className="text-neutral">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6" />
            </svg>
          </Link>
        </li>
        {path.map((item, index) => {
          const href = `/${path.slice(0, index + 1).join("/")}`;

          return (
            <li key={index}>
              <Link href={href}>{item.charAt(0).toUpperCase() + item.slice(1)}</Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default Breadcrumbs;
