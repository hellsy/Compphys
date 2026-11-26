import numpy as np, mpmath, json, time
t0=time.time()
SIG=np.linspace(-7,8,151); T=np.linspace(0,90,451)
H=np.zeros((len(T),len(SIG)))
for i,t in enumerate(T):
    for j,s in enumerate(SIG):
        try: v=abs(mpmath.zeta(complex(s,t)))
        except Exception: v=1e9
        H[i,j]=np.log(float(v)+1e-6)
json.dump({"sig":SIG.tolist(),"t":T.tolist(),"h":np.round(H,3).tolist()},open("zgrid.json","w"))
zeros=[float(mpmath.zetazero(k).imag) for k in range(1,26)]
json.dump(zeros,open("zeros.json","w"))
print(time.time()-t0, H.min(), H.max())
