def avg(xs):
    xs = [x for x in xs if x is not None]
    return sum(xs) / len(xs) if xs else 0

def round1(n):
    return round(float(n), 1)

PASS_MARK = 60
