import csv
import re
import time
import urllib.parse
from pathlib import Path

import requests


INPUT_CSV = Path("/Users/sam/Downloads/MyFavorites-Product-Tue Apr 28 2026.csv")
OUTPUT_CSV = Path("/Users/sam/Documents/Projects/atribe/tmp/atribe_integration_readiness.csv")

HEADERS = [
    "Store",
    "Domain",
    "Program Found",
    "Program Type",
    "Atribe Usability",
    "Signup URL",
    "Tracking Method",
    "Commission",
    "Network/Tool",
    "Evidence URL",
    "Notes",
]

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)

AGGREGATOR_HOSTS = {
    "earnkaro.com",
    "cuelinks.com",
    "vcommission.com",
    "wethrift.com",
    "affi.io",
    "affiliate-toolkit.com",
    "shopper.com",
    "best-affiliate-programs.net",
    "facebook.com",
    "instagram.com",
    "youtube.com",
    "linkedin.com",
    "reddit.com",
    "amazon.in",
    "flipkart.com",
}

NETWORK_HINTS = {
    "goaffpro.com": "GoAffPro",
    "shareasale.com": "ShareASale",
    "impact.com": "Impact",
    "refersion.com": "Refersion",
    "socialsnowball.io": "Social Snowball",
    "grin.live": "GRIN",
    "uppromote.com": "UpPromote",
    "duel.tech": "Duel",
}

SEARCH_ALIASES = {
    "Traya": ["Traya Health"],
    "Gonoise": ["Noise", "Go Noise"],
    "Boat-lifestyle": ["boAt", "Boat Lifestyle"],
    "Thehouseofrare": ["The House of Rare", "House of Rare"],
    "Beminimalist": ["Minimalist"],
    "Discoverpilgrim": ["Pilgrim"],
    "Myfrido": ["Frido"],
    "Thedeconstruct": ["Deconstruct"],
    "Xyxxcrew": ["XYXX"],
    "Myborosil": ["Borosil"],
    "Myraymond": ["Raymond"],
    "Lakmeindia": ["Lakme"],
    "Himalayawellness": ["Himalaya Wellness"],
    "Bellavitaorganic": ["Bella Vita Organic"],
    "Www Snitch": ["Snitch"],
    "Mywishcare": ["WishCare"],
    "Uspoloassn": ["U.S. Polo Assn", "US Polo Assn"],
    "Johnjacobseyewear": ["John Jacobs Eyewear", "John Jacobs"],
    "Myshopify": ["myshopify"],
    "Levi": ["Levi's India", "Levis"],
    "Headsupfortails": ["Heads Up For Tails"],
    "Blurindia": ["Blur India"],
    "Wellbeingnutrition": ["Wellbeing Nutrition"],
    "Duroflexworld": ["Duroflex"],
    "Letshyphen": ["LetsHyphen", "Hyphen"],
    "Satvicmovement": ["Satvic Movement"],
    "Wforwoman": ["W for Woman"],
    "Goeye": ["Go Eye"],
    "Ramrajcotton": ["Ramraj Cotton"],
}


def get(url, timeout=20):
    return requests.get(
        url,
        timeout=timeout,
        headers={"user-agent": USER_AGENT},
        allow_redirects=True,
    )


def search(query):
    url = "https://search.brave.com/search?q=" + urllib.parse.quote_plus(query) + "&source=web"
    text = get(url).text
    results = []
    seen = set()
    for href in re.findall(r'href="(https://[^"]+)"', text):
        if any(
            blocked in href
            for blocked in [
                "search.brave.com",
                "cdn.search.brave.com",
                "imgs.search.brave.com",
                "account.brave.com",
            ]
        ):
            continue
        if href in seen:
            continue
        seen.add(href)
        results.append({"title": "", "url": href})
    return results


def host_of(url):
    host = urllib.parse.urlparse(url).netloc.lower()
    if host.startswith("www."):
        host = host[4:]
    return host


def path_of(url):
    return urllib.parse.urlparse(url).path.lower()


def is_aggregator(url):
    host = host_of(url)
    return any(host == agg or host.endswith("." + agg) for agg in AGGREGATOR_HOSTS)


def looks_official(url, store):
    host = host_of(url)
    if not host or is_aggregator(url):
        return False
    slug = re.sub(r"[^a-z0-9]+", "", store.lower())
    host_slug = re.sub(r"[^a-z0-9]+", "", host.split(".")[0])
    return slug[:6] in host_slug or host_slug[:6] in slug or slug in re.sub(r"[^a-z0-9]+", "", host)


def normalize_store_name(store):
    return store.replace("Www ", "").strip()


def search_terms(store):
    terms = [store]
    if store in SEARCH_ALIASES:
        terms = SEARCH_ALIASES[store] + terms
    if "-" in store:
        terms.append(store.replace("-", " "))
    return list(dict.fromkeys(terms))


def find_domain(store):
    queries = []
    for term in search_terms(store):
        queries.extend(
            [
                f"{term} official site",
                f"{term} shopify official website",
                term,
            ]
        )
    for term in search_terms(store):
        for result in search(term)[:10]:
            if looks_official(result["url"], term):
                return host_of(result["url"]), result["url"]
    for query in queries:
        for result in search(query)[:10]:
            if looks_official(result["url"], store):
                return host_of(result["url"]), result["url"]
    return "", ""


def fetch_page(url):
    try:
        resp = get(url)
        return resp.url, resp.text[:200000]
    except Exception:
        return url, ""


def find_program(store, domain):
    queries = []
    for term in search_terms(store):
        queries.extend(
            [
                f"{term} affiliate program",
                f"{term} ambassador program",
                f"{term} influencer program",
                f"{term} referral program",
                f"{term} refer and earn",
                f"{term} creator program",
            ]
        )
    if domain:
        queries.extend(
            [
                f"site:{domain} affiliate",
                f"site:{domain} ambassador",
                f"site:{domain} influencer",
                f"site:{domain} referral",
                f"site:{domain} refer and earn",
            ]
        )

    for query in queries:
        results = search(query)[:8]
        for result in results:
            url = result["url"]
            title = result["title"].lower()
            host = host_of(url)
            path = path_of(url)
            network = ""
            for hint_host, label in NETWORK_HINTS.items():
                if host == hint_host or host.endswith("." + hint_host):
                    network = label
                    break

            official_or_network = (domain and (host == domain or host.endswith("." + domain))) or network
            if not official_or_network:
                continue

            if not any(
                token in (title + " " + path)
                for token in [
                    "affiliate",
                    "ambassador",
                    "influencer",
                    "referral",
                    "refer",
                    "creator",
                ]
            ):
                continue

            final_url, page = fetch_page(url)
            page_l = page.lower()
            blob = " ".join([title, path, page_l[:5000]])

            program_type = ""
            if "ambassador" in blob:
                program_type = "Ambassador program"
            elif "influencer" in blob or "creator" in blob:
                program_type = "Influencer program"
            elif "referral" in blob or "refer and earn" in blob or "refer-a-friend" in blob:
                program_type = "Referral program"
            elif "affiliate" in blob:
                program_type = "Affiliate program"

            if not program_type:
                continue

            tracking = []
            if "coupon" in blob or "code" in blob:
                tracking.append("coupon code")
            if "referral link" in blob or "refer link" in blob or "unique link" in blob:
                tracking.append("referral link")
            elif "affiliate link" in blob or "trackable link" in blob or network:
                tracking.append("affiliate link")
            if not tracking and "reward point" in blob:
                tracking.append("reward points")

            commission = ""
            percent_match = re.search(r"(\d{1,2}(?:\.\d{1,2})?)\s*%\s*(?:commission|per sale|off)", page, re.I)
            if percent_match:
                commission = percent_match.group(1) + "%"
            else:
                points_match = re.search(r"(\d[\d,]*)\s*(?:reward points|points)", page, re.I)
                if points_match:
                    commission = points_match.group(1) + " reward points"

            notes = []
            signup_url = final_url
            usability = "Medium"
            if "wait for approval" in blob or "apply" in blob or "application" in blob:
                usability = "Medium"
                notes.append("Application/approval appears required")
            if "invite" in blob or "invite-only" in blob or "private" in blob:
                usability = "Hard"
                notes.append("Appears private or invite-led")
            if "sign up" in blob or "join now" in blob or "register" in blob:
                if usability != "Hard":
                    usability = "Easy"
            if program_type == "Referral program" and ("login" in blob or "account" in blob):
                usability = "Hard"
                notes.append("Referral access appears tied to customer login")

            if network and not notes:
                notes.append(f"Program surfaced via {network}")

            return {
                "Program Found": "Yes",
                "Program Type": program_type,
                "Atribe Usability": usability,
                "Signup URL": signup_url,
                "Tracking Method": " + ".join(dict.fromkeys(tracking)),
                "Commission": commission,
                "Network/Tool": network,
                "Evidence URL": final_url,
                "Notes": "; ".join(notes),
            }

    return {
        "Program Found": "No",
        "Program Type": "No public program found",
        "Atribe Usability": "Not usable",
        "Signup URL": "",
        "Tracking Method": "",
        "Commission": "",
        "Network/Tool": "",
        "Evidence URL": "",
        "Notes": "",
    }


def main():
    rows = list(csv.DictReader(INPUT_CSV.open(newline="", encoding="utf-8-sig")))
    out = []
    cache = {}
    for idx, row in enumerate(rows, start=1):
        raw_store = row["Store"].strip()
        store = normalize_store_name(raw_store)
        if store in cache:
            found = dict(cache[store])
        else:
            domain, evidence = find_domain(store)
            found = find_program(store, domain)
            found["Domain"] = domain
            if evidence and not found["Evidence URL"]:
                found["Evidence URL"] = evidence
            cache[store] = dict(found)
            time.sleep(1.2)
        out.append(
            {
                "Store": raw_store,
                "Domain": found.get("Domain", ""),
                **{k: found.get(k, "") for k in HEADERS if k not in {"Store", "Domain"}},
            }
        )
        print(idx, raw_store, found.get("Program Type", ""), found.get("Evidence URL", ""))

    with OUTPUT_CSV.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=HEADERS)
        writer.writeheader()
        writer.writerows(out)


if __name__ == "__main__":
    main()
